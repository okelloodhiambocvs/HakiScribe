import 'dotenv/config';
/**
 * Meta Model API client configuration and request dispatcher.
 * Kept strictly server-side: META_API_KEY / MODEL_API_KEY is never exposed to the client.
 *
 * Verified against official docs (https://dev.meta.ai/docs):
 * - Base URL: https://api.meta.ai/v1 (OpenAI-compatible)
 * - Auth: `Authorization: Bearer <key>` header (keys start with `LLM_...`).
 *   Exception: the realtime ASR WebSocket authenticates inside the handshake
 *   frame, NOT via the HTTP Authorization header (which that endpoint ignores).
 * - Chat Completions serves muse-spark-* AND muse-wonder-1.0 on the same
 *   endpoint: POST /v1/chat/completions with { model, messages, ... }.
 * - Responses are OpenAI-style envelopes: { choices: [{ message: { content } }] }.
 *   Structured JSON must be extracted from choices[0].message.content.
 */

export const META_API_CONFIG = {
  baseUrl: (process.env.META_API_BASE || 'https://api.meta.ai/v1').replace(/\/$/, ''),
  realtimeWsUrl: process.env.META_REALTIME_WS || 'wss://api.meta.ai/v1/asr/realtime',
  // Accept the documented env name (MODEL_API_KEY) as well as our alias.
  apiKey: process.env.META_API_KEY || process.env.MODEL_API_KEY || '',
  voiceModel: process.env.META_VOICE_MODEL || 'muse-voice-transcribe-1.0',
  sparkModel: process.env.META_SPARK_MODEL || 'muse-spark-1.3',
  wonderModel: process.env.META_WONDER_MODEL || 'muse-wonder-1.0',
};

export function metaKeySource(): 'META_API_KEY' | 'MODEL_API_KEY' | null {
  if (process.env.META_API_KEY && process.env.META_API_KEY.trim().length > 0) return 'META_API_KEY';
  if (process.env.MODEL_API_KEY && process.env.MODEL_API_KEY.trim().length > 0) return 'MODEL_API_KEY';
  // Test harnesses may inject the key directly on the config object.
  if (META_API_CONFIG.apiKey && META_API_CONFIG.apiKey.trim().length > 0) return 'META_API_KEY';
  return null;
}

export function isMetaConfigured(): boolean {
  return metaKeySource() !== null;
}

export interface MetaApiResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
  latencyMs: number;
}

export async function postMetaApi<T>(
  endpoint: string,
  body: any,
  isMultipart = false
): Promise<MetaApiResult<T>> {
  const start = Date.now();
  const url = `${META_API_CONFIG.baseUrl}${endpoint}`;

  if (!isMetaConfigured()) {
    return {
      ok: false,
      status: 401,
      error: 'META_API_KEY not configured on server. Fail-closed to mock mode.',
      latencyMs: Date.now() - start,
    };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${META_API_CONFIG.apiKey}`,
  };

  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: isMultipart ? body : JSON.stringify(body),
      signal: AbortSignal.timeout(60000), // 60s timeout
    });

    const latencyMs = Date.now() - start;
    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown network error');
      return { ok: false, status: response.status, error: errText.slice(0, 500), latencyMs };
    }

    const json = (await response.json()) as T;
    return { ok: true, status: response.status, data: json, latencyMs };
  } catch (err: any) {
    return {
      ok: false,
      status: 500,
      error: err?.message || 'Meta API network request failed',
      latencyMs: Date.now() - start,
    };
  }
}

/** OpenAI-compatible Chat Completions response envelope (subset we use). */
export interface MetaChatCompletionResponse {
  id?: string;
  model?: string;
  choices?: Array<{
    message?: { role?: string; content?: string | null };
    finish_reason?: string | null;
  }>;
}

/**
 * Extract the assistant's text content from a Chat Completions envelope.
 * Returns null when the envelope has no usable content (never throws).
 */
export function extractChatContent(response: unknown): string | null {
  if (!response || typeof response !== 'object') return null;
  const choices = (response as MetaChatCompletionResponse).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const content = choices[0]?.message?.content;
  if (typeof content !== 'string' || content.trim().length === 0) return null;
  return content;
}

/**
 * Parse a JSON object out of model text. Handles raw JSON as well as
 * ```json fenced blocks. Returns null on any parse failure (never throws).
 */
export function parseModelJson<T>(content: string): T | null {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = (fenced ? fenced[1] : trimmed).trim();
  if (!candidate.startsWith('{') && !candidate.startsWith('[')) return null;
  try {
    return JSON.parse(candidate) as T;
  } catch {
    return null;
  }
}

export interface ChatJsonRequest {
  model: string;
  developer: string;
  user: string;
  schemaName: string;
  schema: Record<string, unknown>;
  maxTokens?: number;
}

/**
 * Call POST /chat/completions with response_format json_schema and return the
 * parsed JSON payload from the response envelope. Uses the documented
 * `developer` role for instructions (highest precedence) plus a `user` message.
 */
export async function chatCompletionJson<T>(req: ChatJsonRequest): Promise<
  MetaApiResult<T> & { rawContent?: string }
> {
  const result = await postMetaApi<MetaChatCompletionResponse>('/chat/completions', {
    model: req.model,
    messages: [
      { role: 'developer', content: req.developer },
      { role: 'user', content: req.user },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: req.schemaName, schema: req.schema },
    },
    ...(req.maxTokens ? { max_tokens: req.maxTokens } : {}),
  });

  if (!result.ok || !result.data) {
    return { ok: false, status: result.status, error: result.error, latencyMs: result.latencyMs };
  }

  const content = extractChatContent(result.data);
  if (!content) {
    return {
      ok: false,
      status: result.status,
      error: 'Chat Completions response contained no message content.',
      latencyMs: result.latencyMs,
    };
  }

  const parsed = parseModelJson<T>(content);
  if (!parsed) {
    return {
      ok: false,
      status: result.status,
      error: 'Model response was not valid JSON.',
      latencyMs: result.latencyMs,
      rawContent: content.slice(0, 2000),
    };
  }

  return { ok: true, status: result.status, data: parsed, latencyMs: result.latencyMs };
}
