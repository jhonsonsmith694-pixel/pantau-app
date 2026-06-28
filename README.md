# PANTAU — AI Personal Monitor

**Pantau harga, berita, stok, dan jadwal favorit kamu.** Gratis. Offline-first. Android.

## Fitur

- **Pantau** — Monitor harga, berita, stok, jadwal (13+ rekomendasi)
- **Catatan** — Catatan dengan 6 kategori, 6 warna, pin, search, share
- **Detail Notes** — Full screen view dengan edit, share, pin
- **Dark Mode** — Light/Dark/System theme
- **Sync Cloud** — Backup ke Cloudflare D1
- **Offline-First** — AsyncStorage lokal, jalan tanpa internet
- **Pull to Refresh** — Refresh data
- **Edit Monitor** — Long-press untuk edit title/category
- **Theme** — 3 mode tema
- **Settings** — Notifikasi, export, storage info, logout
- **Search** — Cari monitor & catatan
- **Statistik** — Lihat jumlah monitor aktif, catatan, pinned
- **Onboarding** — Nama + avatar saat pertama buka

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| **Frontend** | Expo SDK 56, React Native 0.79, TypeScript 6 |
| **Navigation** | Expo Router (file-based) |
| **Storage** | AsyncStorage (offline) + Cloudflare D1 (cloud) |
| **Backend** | Cloudflare Worker (ES Module) |
| **Database** | Cloudflare D1 (SQLite) |
| **Build** | EAS Build (APK) |
| **CI/CD** | GitHub + Manual |

## Architecture

```
app/                    ← Expo Router screens
  _layout.tsx           ← Root + Splash
  onboarding/           ← First-run setup
  (tabs)/               ← Main tabs
    index.tsx           ← Beranda
    pantau.tsx          ← Monitor list
    catatan.tsx         ← Notes + Detail
    profil.tsx          ← Profile + Settings

src/
  types/                ← TypeScript definitions
  config/               ← App configuration
  api/                  ← API client (Cloudflare)
  storage/              ← AsyncStorage persistence
  context/              ← React Context (state)
  hooks/                ← Custom hooks
  services/             ← Theme, Analytics, AI
  components/           ← Reusable UI components

worker/                 ← Cloudflare Worker
  src/index.mjs         ← API (ES Module + D1)
  migrations/           ← Database schema
```

## API Endpoints

Base: `https://pantau-api.dokumenhilang-id.workers.dev`

| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/api/health` | Health check |
| GET | `/api/version` | Version info |
| POST | `/api/v2/auth/register` | Register user |
| POST | `/api/v2/auth/session` | Get session |
| GET | `/api/v2/users` | Get user + data |
| PUT | `/api/v2/users` | Update profile |
| DELETE | `/api/v2/users` | Delete account |
| GET | `/api/v2/monitors` | List monitors |
| POST | `/api/v2/monitors` | Create monitor |
| PUT | `/api/v2/monitors/:id` | Update monitor |
| DELETE | `/api/v2/monitors/:id` | Delete monitor |
| GET | `/api/v2/notes` | List notes |
| POST | `/api/v2/notes` | Create note |
| PUT | `/api/v2/notes/:id` | Update note |
| DELETE | `/api/v2/notes/:id` | Delete note |
| GET | `/api/v2/reminders` | List reminders |
| POST | `/api/v2/reminders` | Create reminder |
| POST | `/api/v2/sync` | Full sync |
| GET | `/api/v2/settings` | Get settings |
| PUT | `/api/v2/settings` | Update settings |
| POST | `/api/v2/track` | Analytics event |

## Database Tables

`users`, `devices`, `monitors`, `monitor_rules`, `notes`, `reminders`, `events`, `notifications`, `settings`, `subscriptions`, `sync_queue`, `analytics`, `audit_logs`

## Development

```bash
# Install
npm install

# Development
npx expo start

# Build APK
npx eas build --platform android --profile preview

# Deploy Worker
# Update worker/src/index.mjs → deploy via Cloudflare API
```

## Download

APK terbaru: [Download](https://expo.dev/artifacts/eas/yYXbF__9e4VBOxuz-0LTlQ6mAaqpkW-CpjsjFON-iyk.apk)

## License

MIT — built by Bara
