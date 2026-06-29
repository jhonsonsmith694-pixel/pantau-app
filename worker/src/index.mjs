// PANTAU API v2 — Production Worker (Security Hardened)
// JWT auth via Web Crypto API. No npm dependencies needed.

// ===== JWT Implementation (no deps, uses Web Crypto API) =====
function base64url(source) {
  // Convert to bytes then to base64url using TextEncoder
  const bytes = typeof source === 'string' 
    ? new TextEncoder().encode(source)
    : (source instanceof Uint8Array ? source : new Uint8Array(source));
  // Use btoa on binary string
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function signToken(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + 7 * 86400 }; // 7 days

  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(fullPayload));

  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  const sig = await crypto.subtle.sign(
    'HMAC', key,
    new TextEncoder().encode(`${headerB64}.${payloadB64}`)
  );
  return `${headerB64}.${payloadB64}.${base64url(sig)}`;
}

async function verifyToken(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;

    // Verify signature
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false, ['verify']
    );
    const sig = base64urlDecode(sigB64);
    const valid = await crypto.subtle.verify(
      'HMAC', key,
      sig,
      new TextEncoder().encode(`${headerB64}.${payloadB64}`)
    );
    if (!valid) return null;

    // Parse payload
    const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(payloadB64)));

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

// ===== Body size limit =====
const MAX_BODY_SIZE = 1_000_000; // 1MB

async function parseBody(request) {
  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.includes('application/json')) return {};

  const contentLength = parseInt(request.headers.get('Content-Length') || '0');
  if (contentLength > MAX_BODY_SIZE) throw new BodyTooLargeError();

  const text = await request.text();
  if (text.length > MAX_BODY_SIZE) throw new BodyTooLargeError();

  try { return JSON.parse(text); }
  catch { return {}; }
}

class BodyTooLargeError extends Error {
  constructor() {
    super('Payload too large (max 1MB)');
    this.name = 'BodyTooLargeError';
  }
}

// ===== Input sanitization =====
function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/<[^>]*>/g, '')   // Strip HTML tags
            .replace(/[<>"'&]/g, c => ({ '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '&': '&amp;' })[c] || c);
}

function sanitizeAll(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = typeof value === 'string' ? sanitize(value) : value;
  }
  return result;
}

// ===== Column whitelist validation =====
const ALLOWED_COLUMNS = {
  users: new Set(['name', 'avatar', 'email']),
  monitors: new Set(['title', 'category', 'status', 'config', 'provider']),
  notes: new Set(['title', 'content', 'category', 'color', 'pinned', 'archived', 'tags', 'reminder_at']),
  reminders: new Set(['title', 'note', 'due_at', 'repeat', 'completed', 'snoozed_until']),
};

function validateColumns(table, updates) {
  const allowed = ALLOWED_COLUMNS[table];
  if (!allowed) return { valid: false, error: 'Invalid table' };
  const invalid = Object.keys(updates).filter(k => !allowed.has(k));
  if (invalid.length > 0) {
    return { valid: false, error: `Invalid fields: ${invalid.join(', ')}` };
  }
  const valid = Object.keys(updates).filter(k => allowed.has(k));
  return { valid: true, keys: valid };
}

// ===== Worker =====
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;
    const start = Date.now();
    const DB = env.PANTAU_DB;
    const KV = env.PANTAU_KV;
    const JWT_SECRET = env.JWT_SECRET;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const error = (msg, status = 400) => json({ error: msg }, status);

    // Fail closed if the signing secret is not configured — never fall back to a known value
    if (!JWT_SECRET) return error('Server misconfigured: JWT_SECRET not set', 500);

    const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);
    const uid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).substr(2,9)}`;
    const ip = () => request.headers.get('CF-Connecting-IP') || '';
    const ua = () => request.headers.get('User-Agent') || '';

    // Rate limiting via KV (100 req/min per IP)
    async function checkRateLimit(identifier) {
      if (!KV) return true;
      const key = `ratelimit:${identifier}:${Math.floor(Date.now() / 60000)}`;
      try {
        const count = parseInt(await KV.get(key) || '0');
        if (count >= 100) return false;
        await KV.put(key, String(count + 1), { expirationTtl: 120 });
        return true;
      } catch { return true; }
    }

    if (!(await checkRateLimit(ip()))) return json({ error: 'Too many requests' }, 429);

    // JWT Auth — verify Bearer token
    async function getUserFromHeader() {
      const auth = request.headers.get('Authorization');
      if (!auth || !auth.startsWith('Bearer ')) return null;
      const token = auth.slice(7).trim();
      if (!token) return null;
      const payload = await verifyToken(token, JWT_SECRET);
      return payload?.sub || null;
    }

    // Log
    async function log(action, resource, resourceId, details = {}) {
      try {
        await DB.prepare(
          'INSERT INTO audit_logs (id, user_id, action, resource, resource_id, details, ip, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(uid(), details.userId || null, action, resource, resourceId, JSON.stringify(details), ip(), now()).run();
      } catch {}
    }

    // Validate required fields
    function requireFields(body, fields) {
      const missing = fields.filter(f => !body[f] && body[f] !== 0);
      if (missing.length) return error(`Field wajib: ${missing.join(', ')}`);
      return null;
    }

    // ============= ROUTES =============
    try {
      const path = url.pathname;
      const match = path.match(/\/api\/v2\/([^\/]+)(?:\/([^\/]+))?(?:\/([^\/]+))?/);
      const [, resource, param1, param2] = match || [];

      // HEALTH (no auth)
      if (path === '/api/health') return json({
        status: 'ok', version: '2.3.0', ts: now(), uptime: start,
      });

      // VERSION (no auth)
      if (path === '/api/version') return json({
        name: 'pantau-api', version: '2.3.0', built_at: '2026-06-27',
        features: ['auth', 'jwt', 'monitors', 'notes', 'reminders', 'sync', 'analytics', 'ai', 'web-search'],
      });

      // ============= AUTH =============
      if (resource === 'auth') {
        if (path.endsWith('/register') && method === 'POST') {
          let body;
          try { 
            body = await parseBody(request); 
          } catch (e) {
            return e instanceof BodyTooLargeError ? json({ error: e.message }, 413) : error('Invalid body', 400);
          }
          body = sanitizeAll(body);
          const { userId, name, email, avatar } = body;
          if (!userId || !name) return error('userId dan name wajib', 400);
          if (userId.length < 2 || userId.length > 50) return error('userId panjang 2-50 karakter', 400);
          if (name.length < 1 || name.length > 100) return error('name panjang 1-100 karakter', 400);
          const existing = await DB.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first();
          if (existing) return error('User sudah ada', 409);
          await DB.prepare(
            'INSERT INTO users (id, name, email, avatar, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
          ).bind(userId, name, email || null, avatar || 'person', now(), now()).run();
          const token = await signToken({ sub: userId }, JWT_SECRET);
          await log('user.register', 'user', userId, { userId });
          return json({ success: true, userId, token }, 201);
        }

        if (path.endsWith('/session') && method === 'POST') {
          const authUser = await getUserFromHeader();
          if (!authUser) return error('Unauthorized', 401);
          const user = await DB.prepare('SELECT * FROM users WHERE id = ?').bind(authUser).first();
          if (!user) return error('User tidak ditemukan', 404);
          const token = await signToken({ sub: authUser }, JWT_SECRET);
          return json({ user, token, session: { id: uid() } });
        }
      }

      // ============= AUTHENTICATED RESOURCES BELOW =============
      // All routes below this require valid JWT
      const authUser = await getUserFromHeader();
      if (resource !== 'auth' && !authUser) return error('Unauthorized', 401);

      // ============= AI (NVIDIA NIM proxy — API key stays server-side) =============
      if (resource === 'ai') {
        if (param1 === 'insight' && method === 'POST') {
          if (!env.NVIDIA_API_KEY) return error('AI belum dikonfigurasi di server', 503);
          let body;
          try { body = await parseBody(request); } catch (e) {
            return e instanceof BodyTooLargeError ? json({ error: e.message }, 413) : error('Invalid body', 400);
          }
          const items = Array.isArray(body.items) ? body.items.slice(0, 50) : [];
          const question = typeof body.question === 'string' ? body.question.slice(0, 500) : '';
          const lines = items.map((it) => {
            const t = String(it.title || '').slice(0, 120);
            const v = it.value != null && it.value !== '' ? String(it.value).slice(0, 60) : 'manual';
            const c = it.change != null && !isNaN(Number(it.change)) ? ` (${Number(it.change).toFixed(2)}% 24j)` : '';
            return `- ${t}: ${v}${c}`;
          }).join('\n');
          const system = 'Kamu asisten finansial pribadi untuk pengguna Indonesia. Jawab ringkas maksimal 4 kalimat, Bahasa Indonesia santai dan actionable. Hanya gunakan angka dari data yang diberikan, jangan mengarang.';
          const userMsg = (question ? `Pertanyaan: ${question}\n\n` : 'Beri ringkasan dan insight dari pantauan berikut:\n') + (lines || '(belum ada data pantauan)');
          const model = env.NVIDIA_MODEL || 'meta/llama-3.1-8b-instruct';
          try {
            const aiRes = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.NVIDIA_API_KEY}` },
              body: JSON.stringify({
                model,
                messages: [{ role: 'system', content: system }, { role: 'user', content: userMsg }],
                temperature: 0.4, max_tokens: 300, stream: false,
              }),
            });
            if (!aiRes.ok) {
              await log('ai.error', 'ai', null, { userId: authUser, status: aiRes.status });
              return error('AI provider error', 502);
            }
            const data = await aiRes.json();
            const insight = (data?.choices?.[0]?.message?.content || '').trim();
            await log('ai.insight', 'ai', null, { userId: authUser, items: items.length });
            return json({ insight, model });
          } catch (e) {
            return error('Gagal memanggil AI', 502);
          }
        }

        // /api/v2/ai/ask — free-form question answered with live web search
        // (Firecrawl) + the user's price data, summarised by NVIDIA NIM.
        if (param1 === 'ask' && method === 'POST') {
          if (!env.NVIDIA_API_KEY) return error('AI belum dikonfigurasi di server', 503);
          let body;
          try { body = await parseBody(request); } catch (e) {
            return e instanceof BodyTooLargeError ? json({ error: e.message }, 413) : error('Invalid body', 400);
          }
          const question = typeof body.question === 'string' ? body.question.slice(0, 500).trim() : '';
          if (!question) return error('Pertanyaan kosong', 400);
          const items = Array.isArray(body.items) ? body.items.slice(0, 50) : [];
          const wantWeb = body.web !== false;
          const priceLines = items.map((it) => {
            const t = String(it.title || '').slice(0, 120);
            const v = it.value != null && it.value !== '' ? String(it.value).slice(0, 60) : 'manual';
            const c = it.change != null && !isNaN(Number(it.change)) ? ` (${Number(it.change).toFixed(2)}% 24j)` : '';
            return `- ${t}: ${v}${c}`;
          }).join('\n');

          // 1) Firecrawl web search for fresh, real-world context.
          let webContext = '';
          let sources = [];
          if (wantWeb && env.FIRECRAWL_API_KEY) {
            try {
              const fcRes = await fetch('https://api.firecrawl.dev/v2/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.FIRECRAWL_API_KEY}` },
                body: JSON.stringify({ query: question, limit: 4 }),
              });
              if (fcRes.ok) {
                const fc = await fcRes.json();
                const web = (fc?.data?.web || fc?.data || []).slice(0, 4);
                sources = web.map((r) => ({ title: String(r.title || '').slice(0, 160), url: r.url }));
                webContext = web.map((r, i) =>
                  `[${i + 1}] ${String(r.title || '').slice(0, 160)}\n${String(r.description || r.snippet || '').slice(0, 400)}\n(${r.url})`
                ).join('\n\n');
              }
            } catch (e) { /* web is best-effort; fall through to price-only answer */ }
          }

          const system = 'Kamu asisten pribadi untuk pengguna Indonesia. Jawab ringkas (maks 5 kalimat), Bahasa Indonesia santai dan akurat. Pakai data harga pengguna dan hasil pencarian web terkini yang diberikan. Jangan mengarang angka — kalau datanya tidak ada, katakan terus terang. Kalau memakai info dari web, sebut sumbernya secara singkat.';
          const userMsg = [
            items.length ? `Data pantauan pengguna:\n${priceLines}` : '',
            webContext ? `Hasil pencarian web terkini:\n${webContext}` : '',
            `Pertanyaan: ${question}`,
          ].filter(Boolean).join('\n\n');
          const model = env.NVIDIA_MODEL || 'meta/llama-3.1-8b-instruct';
          try {
            const aiRes = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.NVIDIA_API_KEY}` },
              body: JSON.stringify({
                model,
                messages: [{ role: 'system', content: system }, { role: 'user', content: userMsg }],
                temperature: 0.4, max_tokens: 420, stream: false,
              }),
            });
            if (!aiRes.ok) {
              await log('ai.error', 'ai', null, { userId: authUser, status: aiRes.status });
              return error('AI provider error', 502);
            }
            const data = await aiRes.json();
            const answer = (data?.choices?.[0]?.message?.content || '').trim();
            await log('ai.ask', 'ai', null, { userId: authUser, web: sources.length });
            return json({ answer, sources, model, usedWeb: sources.length > 0 });
          } catch (e) {
            return error('Gagal memanggil AI', 502);
          }
        }

        return error('Not found', 404);
      }

      // ============= USERS =============
      if (resource === 'users') {
        if (method === 'GET') {
          const user = await DB.prepare('SELECT * FROM users WHERE id = ?').bind(authUser).first();
          if (!user) return error('User tidak ditemukan', 404);
          const [monitors, notes, reminders, events, settings] = await Promise.all([
            DB.prepare('SELECT * FROM monitors WHERE user_id = ? ORDER BY updated_at DESC').bind(authUser).all(),
            DB.prepare('SELECT * FROM notes WHERE user_id = ? AND archived = 0 ORDER BY pinned DESC, updated_at DESC').bind(authUser).all(),
            DB.prepare('SELECT * FROM reminders WHERE user_id = ? AND completed = 0 ORDER BY due_at ASC').bind(authUser).all(),
            DB.prepare('SELECT * FROM events WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').bind(authUser).all(),
            DB.prepare('SELECT key, value FROM settings WHERE user_id = ?').bind(authUser).all(),
          ]);
          const settingsMap = {};
          (settings.results || []).forEach(s => settingsMap[s.key] = s.value);
          return json({
            user, monitors: monitors.results || [], notes: notes.results || [],
            reminders: reminders.results || [], events: events.results || [],
            settings: settingsMap,
          });
        }

        if (method === 'PUT') {
          let body;
          try { body = await parseBody(request); } catch (e) {
            return e instanceof BodyTooLargeError ? json({ error: e.message }, 413) : error('Invalid body', 400);
          }
          body = sanitizeAll(body);
          const { valid, keys, error: colError } = validateColumns('users', body);
          if (!valid) return error(`Invalid fields: ${keys ? keys.join(', ') : colError}`, 400);
          const sets = keys.map(k => `${k} = ?`).join(', ');
          if (!sets) return error('No valid fields', 400);
          const vals = keys.map(k => body[k]);
          vals.push(now(), authUser);
          await DB.prepare(`UPDATE users SET ${sets}, updated_at = ? WHERE id = ?`).bind(...vals).run();
          await log('user.update', 'user', authUser);
          return json({ success: true });
        }

        if (method === 'DELETE') {
          await DB.prepare('DELETE FROM users WHERE id = ?').bind(authUser).run();
          await log('user.delete', 'user', authUser);
          return json({ success: true });
        }
      }

      // ============= MONITORS =============
      if (resource === 'monitors') {
        if (method === 'GET') {
          const { category, status } = Object.fromEntries(url.searchParams);
          let query = 'SELECT * FROM monitors WHERE user_id = ?';
          const params = [authUser];
          if (category) { query += ' AND category = ?'; params.push(category); }
          if (status) { query += ' AND status = ?'; params.push(status); }
          query += ' ORDER BY updated_at DESC';
          const r = await DB.prepare(query).bind(...params).all();
          return json(r.results || []);
        }

        if (method === 'POST') {
          let body;
          try { body = await parseBody(request); } catch (e) {
            return e instanceof BodyTooLargeError ? json({ error: e.message }, 413) : error('Invalid body', 400);
          }
          body = sanitizeAll(body);
          const err = requireFields(body, ['title']);
          if (err) return err;
          if (body.title.length > 200) return error('title maksimal 200 karakter', 400);
          const id = uid();
          await DB.prepare(
            'INSERT INTO monitors (id, user_id, title, category, config, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
          ).bind(id, authUser, body.title, body.category || 'harga', body.config || null, now(), now()).run();
          await log('monitor.create', 'monitor', id, { title: body.title });
          const created = await DB.prepare('SELECT * FROM monitors WHERE id = ?').bind(id).first();
          return json(created, 201);
        }

        if (method === 'PUT' && param1) {
          let body;
          try { body = await parseBody(request); } catch (e) {
            return e instanceof BodyTooLargeError ? json({ error: e.message }, 413) : error('Invalid body', 400);
          }
          body = sanitizeAll(body);
          const { valid, keys, error: colError } = validateColumns('monitors', body);
          if (!valid) return error(colError || 'Invalid fields', 400);
          const sets = keys.map(k => `${k} = ?`).join(', ');
          if (!sets) return error('No valid fields', 400);
          const vals = keys.map(k => body[k]);
          vals.push(now(), param1, authUser);
          const r = await DB.prepare(`UPDATE monitors SET ${sets}, updated_at = ? WHERE id = ? AND user_id = ? RETURNING *`).bind(...vals).first();
          if (!r) return error('Monitor tidak ditemukan', 404);
          await log('monitor.update', 'monitor', param1);
          return json(r);
        }

        if (method === 'DELETE' && param1) {
          const r = await DB.prepare('DELETE FROM monitors WHERE id = ? AND user_id = ?').bind(param1, authUser).run();
          if (r.meta.changes === 0) return error('Monitor tidak ditemukan', 404);
          await log('monitor.delete', 'monitor', param1);
          return json({ success: true });
        }

        if (path.endsWith('/sync') && method === 'POST') {
          let body;
          try { body = await parseBody(request); } catch (e) {
            return e instanceof BodyTooLargeError ? json({ error: e.message }, 413) : error('Invalid body', 400);
          }
          body = sanitizeAll(body);
          if (body.monitors) {
            await DB.prepare('DELETE FROM monitors WHERE user_id = ?').bind(authUser).run();
            for (const m of body.monitors) {
              await DB.prepare(
                'INSERT OR REPLACE INTO monitors (id, user_id, title, category, status, config, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
              ).bind(m.id || uid(), authUser, sanitize(m.title), m.category || 'harga', m.status || 'active', JSON.stringify(m.config || {}), m.created_at || now(), now()).run();
            }
          }
          return json({ success: true, count: (body.monitors || []).length });
        }
      }

      // ============= NOTES =============
      if (resource === 'notes') {
        if (method === 'GET') {
          const { category, search, archived } = Object.fromEntries(url.searchParams);
          let query = 'SELECT * FROM notes WHERE user_id = ?';
          const params = [authUser];
          if (category) { query += ' AND category = ?'; params.push(category); }
          if (!archived) query += ' AND archived = 0';
          if (search) { query += ' AND (title LIKE ? OR content LIKE ?)'; params.push(`%${search.replace(/[%_]/g, '\\$&')}%`, `%${search.replace(/[%_]/g, '\\$&')}%`); }
          query += ' ORDER BY pinned DESC, updated_at DESC';
          const r = await DB.prepare(query).bind(...params).all();
          return json(r.results || []);
        }

        if (method === 'POST') {
          let body;
          try { body = await parseBody(request); } catch (e) {
            return e instanceof BodyTooLargeError ? json({ error: e.message }, 413) : error('Invalid body', 400);
          }
          body = sanitizeAll(body);
          const err = requireFields(body, ['title', 'content']);
          if (err) return err;
          if (body.title.length > 100) return error('title maksimal 100 karakter', 400);
          if (body.content.length > 10000) return error('content maksimal 10000 karakter', 400);
          const id = uid();
          await DB.prepare(
            'INSERT INTO notes (id, user_id, title, content, category, color, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
          ).bind(id, authUser, body.title, body.content, body.category || 'Umum', body.color || '#FFFFFF', JSON.stringify(body.tags || []), now(), now()).run();
          await log('note.create', 'note', id, { title: body.title });
          const created = await DB.prepare('SELECT * FROM notes WHERE id = ?').bind(id).first();
          return json(created, 201);
        }

        if (method === 'PUT' && param1) {
          let body;
          try { body = await parseBody(request); } catch (e) {
            return e instanceof BodyTooLargeError ? json({ error: e.message }, 413) : error('Invalid body', 400);
          }
          body = sanitizeAll(body);
          const { valid, keys, error: colError } = validateColumns('notes', body);
          if (!valid) return error(colError || 'Invalid fields', 400);
          const sets = keys.map(k => `${k} = ?`).join(', ');
          if (!sets) return error('No valid fields', 400);
          const vals = keys.map(k => body[k]);
          vals.push(now(), param1, authUser);
          const r = await DB.prepare(`UPDATE notes SET ${sets}, updated_at = ? WHERE id = ? AND user_id = ? RETURNING *`).bind(...vals).first();
          if (!r) return error('Catatan tidak ditemukan', 404);
          await log('note.update', 'note', param1);
          return json(r);
        }

        if (method === 'DELETE' && param1) {
          const r = await DB.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?').bind(param1, authUser).run();
          if (r.meta.changes === 0) return error('Catatan tidak ditemukan', 404);
          await log('note.delete', 'note', param1);
          return json({ success: true });
        }
      }

      // ============= REMINDERS =============
      if (resource === 'reminders') {
        if (method === 'GET') {
          const { completed } = Object.fromEntries(url.searchParams);
          let query = 'SELECT * FROM reminders WHERE user_id = ?';
          const params = [authUser];
          if (completed === '1') query += ' AND completed = 1';
          else query += ' AND completed = 0';
          query += ' ORDER BY due_at ASC';
          const r = await DB.prepare(query).bind(...params).all();
          return json(r.results || []);
        }

        if (method === 'POST') {
          let body;
          try { body = await parseBody(request); } catch (e) {
            return e instanceof BodyTooLargeError ? json({ error: e.message }, 413) : error('Invalid body', 400);
          }
          body = sanitizeAll(body);
          const err = requireFields(body, ['title', 'due_at']);
          if (err) return err;
          const id = uid();
          await DB.prepare(
            'INSERT INTO reminders (id, user_id, title, note, due_at, repeat, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
          ).bind(id, authUser, body.title, body.note || null, body.due_at, body.repeat || null, now(), now()).run();
          const created = await DB.prepare('SELECT * FROM reminders WHERE id = ?').bind(id).first();
          return json(created, 201);
        }

        if (method === 'PUT' && param1) {
          let body;
          try { body = await parseBody(request); } catch (e) {
            return e instanceof BodyTooLargeError ? json({ error: e.message }, 413) : error('Invalid body', 400);
          }
          body = sanitizeAll(body);
          const { valid, keys, error: colError } = validateColumns('reminders', body);
          if (!valid) return error(colError || 'Invalid fields', 400);
          const sets = keys.map(k => `${k} = ?`).join(', ');
          if (!sets) return error('No valid fields', 400);
          const vals = keys.map(k => body[k]);
          vals.push(now(), param1, authUser);
          const r = await DB.prepare(`UPDATE reminders SET ${sets}, updated_at = ? WHERE id = ? AND user_id = ? RETURNING *`).bind(...vals).first();
          if (!r) return error('Pengingat tidak ditemukan', 404);
          return json(r);
        }

        if (method === 'DELETE' && param1) {
          const r = await DB.prepare('DELETE FROM reminders WHERE id = ? AND user_id = ?').bind(param1, authUser).run();
          if (r.meta.changes === 0) return error('Pengingat tidak ditemukan', 404);
          return json({ success: true });
        }
      }

      // ============= EVENTS =============
      if (resource === 'events' && method === 'GET') {
        const { type, limit = '50' } = Object.fromEntries(url.searchParams);
        let query = 'SELECT * FROM events WHERE user_id = ?';
        const params = [authUser];
        if (type) { query += ' AND type = ?'; params.push(type); }
        query += ' ORDER BY created_at DESC LIMIT ?';
        params.push(parseInt(limit));
        const r = await DB.prepare(query).bind(...params).all();
        return json(r.results || []);
      }

      // ============= ANALYTICS =============
      if (resource === 'analytics' && method === 'POST') {
        let body;
        try { body = await parseBody(request); } catch (e) {
          return e instanceof BodyTooLargeError ? json({ error: e.message }, 413) : error('Invalid body', 400);
        }
        if (!body.event) return error('event wajib', 400);
        await DB.prepare(
          'INSERT INTO analytics (id, user_id, event, properties, device_info, ip, user_agent, session_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(uid(), authUser, body.event, JSON.stringify(body.properties || {}), JSON.stringify(body.deviceInfo || {}), ip(), ua(), body.sessionId || null, now()).run();
        return json({ success: true }, 201);
      }

      // ============= SYNC =============
      if (resource === 'sync' && method === 'POST') {
        let body;
        try { body = await parseBody(request); } catch (e) {
          return e instanceof BodyTooLargeError ? json({ error: e.message }, 413) : error('Invalid body', 400);
        }
        body = sanitizeAll(body);
        const results = { monitors: 0, notes: 0, reminders: 0 };

        if (body.monitors) {
          await DB.prepare('DELETE FROM monitors WHERE user_id = ?').bind(authUser).run();
          for (const m of body.monitors) {
            await DB.prepare(
              'INSERT INTO monitors (id, user_id, title, category, status, config, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            ).bind(m.id || uid(), authUser, sanitize(m.title), m.category || 'harga', m.status || 'active', JSON.stringify(m.config || {}), m.created_at || now(), now()).run();
            results.monitors++;
          }
        }
        if (body.notes) {
          await DB.prepare('DELETE FROM notes WHERE user_id = ?').bind(authUser).run();
          for (const n of body.notes) {
            await DB.prepare(
              'INSERT INTO notes (id, user_id, title, content, category, color, pinned, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            ).bind(n.id || uid(), authUser, sanitize(n.title), sanitize(n.content || ''), n.category || 'Umum', n.color || '#FFFFFF', n.pinned ? 1 : 0, JSON.stringify(n.tags || []), n.created_at || now(), now()).run();
            results.notes++;
          }
        }
        if (body.reminders) {
          await DB.prepare('DELETE FROM reminders WHERE user_id = ?').bind(authUser).run();
          for (const r of body.reminders) {
            await DB.prepare(
              'INSERT INTO reminders (id, user_id, title, note, due_at, repeat, completed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
            ).bind(r.id || uid(), authUser, sanitize(r.title), r.note || null, r.due_at, r.repeat || null, r.completed ? 1 : 0, r.created_at || now(), now()).run();
            results.reminders++;
          }
        }

        await DB.prepare('UPDATE users SET last_sync_at = ?, updated_at = ? WHERE id = ?').bind(now(), now(), authUser).run();
        await log('sync.complete', 'sync', authUser, results);
        return json({ success: true, synced: results, ts: now() });
      }

      // ============= SETTINGS =============
      if (resource === 'settings') {
        if (method === 'GET') {
          const r = await DB.prepare('SELECT key, value FROM settings WHERE user_id = ?').bind(authUser).all();
          const map = {};
          (r.results || []).forEach(s => map[s.key] = s.value);
          return json(map);
        }

        if (method === 'POST' || method === 'PUT') {
          let body;
          try { body = await parseBody(request); } catch (e) {
            return e instanceof BodyTooLargeError ? json({ error: e.message }, 413) : error('Invalid body', 400);
          }
          body = sanitizeAll(body);
          for (const [key, value] of Object.entries(body)) {
            if (typeof key !== 'string' || key.length > 50) continue;
            const existing = await DB.prepare('SELECT id FROM settings WHERE user_id = ? AND key = ?').bind(authUser, key).first();
            if (existing) {
              await DB.prepare('UPDATE settings SET value = ?, updated_at = ? WHERE id = ?').bind(String(value).slice(0, 500), now(), existing.id).run();
            } else {
              await DB.prepare('INSERT INTO settings (id, user_id, key, value, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').bind(uid(), authUser, key, String(value).slice(0, 500), now(), now()).run();
            }
          }
          return json({ success: true });
        }
      }

      // ============= NOTIFICATIONS =============
      if (resource === 'notifications') {
        if (method === 'GET') {
          const { unread } = Object.fromEntries(url.searchParams);
          let query = 'SELECT * FROM notifications WHERE user_id = ?';
          const params = [authUser];
          if (unread) { query += ' AND read = 0'; }
          query += ' ORDER BY created_at DESC LIMIT 50';
          const r = await DB.prepare(query).bind(...params).all();
          return json(r.results || []);
        }

        if (method === 'POST' && path.endsWith('/read')) {
          let body;
          try { body = await parseBody(request); } catch (e) {
            return e instanceof BodyTooLargeError ? json({ error: e.message }, 413) : error('Invalid body', 400);
          }
          const { ids } = body;
          if (ids?.length) {
            for (const id of ids) {
              await DB.prepare('UPDATE notifications SET read = 1, read_at = ? WHERE id = ? AND user_id = ?').bind(now(), id, authUser).run();
            }
          }
          return json({ success: true });
        }
      }

      // ============= ANALYTICS EVENT =============
      if (resource === 'track' && method === 'POST') {
        let body;
        try { body = await parseBody(request); } catch (e) {
          return e instanceof BodyTooLargeError ? json({ error: e.message }, 413) : error('Invalid body', 400);
        }
        await DB.prepare(
          'INSERT INTO analytics (id, user_id, event, properties, device_info, ip, user_agent, session_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(uid(), body.userId || null, body.event, JSON.stringify(body.properties || {}), JSON.stringify(body.deviceInfo || {}), ip(), ua(), body.sessionId || null, now()).run();
        return json({ success: true }, 201);
      }

      return json({ error: 'Route not found', path, method }, 404);

    } catch (e) {
      if (e instanceof BodyTooLargeError) return json({ error: e.message }, 413);
      const msg = e.message || 'Internal error';
      await log('error', 'system', null, { path: url.pathname, error: msg }).catch(() => {});
      return json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
    }
  }
};
