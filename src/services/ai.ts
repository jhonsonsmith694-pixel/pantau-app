// PANTAU AI Engine — provider-agnostic AI abstraction
import { CONFIG, PROVIDER_URLS } from '../config';
import { logger } from './logger';

// Hermes-safe timeout helper
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('Request timeout')), ms);
    promise.then(resolve, reject).finally(() => clearTimeout(id));
  });
}

// ===== Types =====
export type AIProviderType = 'nvidia' | 'openai' | 'gemini' | 'local';

export type AIMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type AICompletionOptions = {
  temperature?: number;
  maxTokens?: number;
  model?: string;
  stream?: boolean;
  provider?: AIProviderType;
};

export type AIProviderConfig = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  timeout?: number;
};

export type AIProvider = {
  readonly type: AIProviderType;
  readonly name: string;
  complete(messages: AIMessage[], options?: AICompletionOptions): Promise<string>;
  isAvailable(): boolean;
};

// ===== Prompt Builder =====
export class PromptBuilder {
  private systemPrompts: Map<string, string> = new Map();

  register(name: string, prompt: string) {
    this.systemPrompts.set(name, prompt);
  }

  build(systemKey: string, userMessage: string, context?: Record<string, any>): AIMessage[] {
    const systemPrompt = this.systemPrompts.get(systemKey) || 'You are a helpful AI assistant.';
    const messages: AIMessage[] = [{ role: 'system', content: systemPrompt }];
    if (context && Object.keys(context).length > 0) {
      messages.push({ role: 'user', content: `Context:\n${JSON.stringify(context, null, 2)}` });
    }
    messages.push({ role: 'user', content: userMessage });
    return messages;
  }
}

// ===== Response Parser =====
export class ResponseParser {
  static extractJSON(text: string): Record<string, any> | null {
    try {
      const match = text.match(/\{[\s\S]*\}/);
      return match ? JSON.parse(match[0]) : null;
    } catch {
      return null;
    }
  }

  static extractArray(text: string): any[] | null {
    try {
      const match = text.match(/\[[\s\S]*\]/);
      return match ? JSON.parse(match[0]) : null;
    } catch {
      return null;
    }
  }

  static extractTextAfter(text: string, delimiter: string): string {
    const idx = text.indexOf(delimiter);
    return idx >= 0 ? text.slice(idx + delimiter.length).trim() : text;
  }

  static cleanMarkdown(text: string): string {
    return text.replace(/#{1,6}\s/g, '').replace(/\*{1,2}/g, '').replace(/`{1,3}/g, '').trim();
  }
}

// ===== NVIDIA NIM Provider =====
class NvidiaNIMProvider implements AIProvider {
  readonly type: AIProviderType = 'nvidia';  // intentionally typo'd for provider key
  readonly name = 'NVIDIA NIM';
  private config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = {
      baseUrl: PROVIDER_URLS.nvidiaBase,
      model: 'meta/llama-3.1-8b-instruct',
      timeout: 30000,
      ...config,
    };
  }

  isAvailable(): boolean {
    return !!this.config.apiKey;
  }

  async complete(messages: AIMessage[], options?: AICompletionOptions): Promise<string> {
    if (!this.isAvailable()) throw new Error('NVIDIA NIM API key not configured');
    const res = await withTimeout(fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: options?.model || this.config.model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 1024,
        stream: false,
      }),
      
    }), this.config.timeout!);
    if (!res.ok) throw new Error(`NVIDIA API error: ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }
}

// ===== OpenAI Provider =====
class OpenAIProvider implements AIProvider {
  readonly type: AIProviderType = 'openai';
  readonly name = 'OpenAI';
  private config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = {
      baseUrl: PROVIDER_URLS.openaiBase,
      model: 'gpt-4o-mini',
      timeout: 30000,
      ...config,
    };
  }

  isAvailable(): boolean { return !!this.config.apiKey; }

  async complete(messages: AIMessage[], options?: AICompletionOptions): Promise<string> {
    if (!this.isAvailable()) throw new Error('OpenAI API key not configured');
    const res = await withTimeout(fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: options?.model || this.config.model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 1024,
      }),
      
    }), this.config.timeout!);
    if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }
}

// ===== Gemini Provider =====
class GeminiProvider implements AIProvider {
  readonly type: AIProviderType = 'gemini';
  readonly name = 'Google Gemini';
  private config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = {
      baseUrl: PROVIDER_URLS.geminiBase,
      model: 'gemini-1.5-flash',
      timeout: 30000,
      ...config,
    };
  }

  isAvailable(): boolean { return !!this.config.apiKey; }

  async complete(messages: AIMessage[], options?: AICompletionOptions): Promise<string> {
    if (!this.isAvailable()) throw new Error('Gemini API key not configured');
    // Convert OpenAI-style messages to Gemini format
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    const res = await fetch(
      `${this.config.baseUrl}/models/${options?.model || this.config.model}:generateContent?key=${this.config.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
        
      }
    );
    if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
}

// ===== Local Provider (placeholder — runs on-device models) =====
class LocalProvider implements AIProvider {
  readonly type: AIProviderType = 'local';
  readonly name = 'Local AI';
  private config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = {
      baseUrl: PROVIDER_URLS.ollamaBase,  // Ollama default
      model: 'llama3.2:1b',
      timeout: 60000,
      ...config,
    };
  }

  isAvailable(): boolean { return true; }

  async complete(messages: AIMessage[], options?: AICompletionOptions): Promise<string> {
    const res = await withTimeout(fetch(`${this.config.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options?.model || this.config.model,
        messages,
        stream: false,
      }),
      
    }), this.config.timeout!);
    if (!res.ok) throw new Error(`Local AI error: ${res.status}`);
    const data = await res.json();
    return data.message?.content || '';
  }
}

// ===== AI Service (main entry) =====
class AIService {
  private providers: Map<AIProviderType, AIProvider> = new Map();
  private defaultProvider: AIProviderType = 'local';
  public readonly promptBuilder: PromptBuilder = new PromptBuilder();

  constructor() {
    // Start clean — no providers registered until initAI() is called
    // This avoids failing when API keys aren't set
    this.registerPrompts();
  }

  private registerPrompts() {
    this.promptBuilder.register('summarize', 'Summarize the following text concisely in Indonesian.');
    this.promptBuilder.register('analyze', 'Analyze the following data and provide insights in Indonesian.');
    this.promptBuilder.register('translate', 'Translate the following text to Indonesian.');
    this.promptBuilder.register('categorize', 'Categorize the following item into one of: harga, berita, stok, jadwal.');
    this.promptBuilder.register('suggest', 'Suggest related items to monitor based on user interests.');
  }

  register(provider: AIProvider) {
    this.providers.set(provider.type, provider);
  }

  setDefaultProvider(type: AIProviderType) {
    if (this.providers.has(type)) {
      this.defaultProvider = type;
    }
  }

  getProvider(type?: AIProviderType): AIProvider | undefined {
    return type ? this.providers.get(type) : this.providers.get(this.defaultProvider);
  }

  listProviders(): { type: AIProviderType; name: string; available: boolean }[] {
    return Array.from(this.providers.values()).map(p => ({
      type: p.type,
      name: p.name,
      available: p.isAvailable(),
    }));
  }

  async complete(
    messages: AIMessage[],
    options?: AICompletionOptions
  ): Promise<string> {
    const provider = this.getProvider(options?.provider);
    if (!provider) throw new Error(`No AI provider available (default: ${this.defaultProvider})`);
    const start = performance.now();
    try {
      const result = await provider.complete(messages, options);
      const duration = performance.now() - start;
      logger.debug(`AI[${provider.name}] completed in ${Math.round(duration)}ms`, undefined, 'ai');
      return result;
    } catch (e: any) {
      logger.error(`AI[${provider.name}] failed: ${e.message}`, undefined, 'ai');
      throw e;
    }
  }

  // Convenience: send a single prompt
  async ask(system: string, userMessage: string, options?: AICompletionOptions): Promise<string> {
    return this.complete([
      { role: 'system', content: system },
      { role: 'user', content: userMessage },
    ], options);
  }

  // Convenience: prompt from builder
  async askWithPrompt(promptKey: string, userMessage: string, context?: Record<string, any>, options?: AICompletionOptions): Promise<string> {
    const messages = this.promptBuilder.build(promptKey, userMessage, context);
    return this.complete(messages, options);
  }
}

// Singleton instance.
export const ai = new AIService();

// NOTE: AI now runs server-side via the Cloudflare Worker (POST /api/v2/ai/insight),
// so NO provider API key is shipped in the app bundle. Use api.aiInsight() from the
// app. This in-app AIService is kept only for optional on-device/local providers and
// must never embed a secret key in client source.
export function initAI() {
  // no-op by default: providers are configured server-side.
}

export type AIServiceType = AIService;
