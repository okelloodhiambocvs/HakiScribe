import 'dotenv/config';
/**
 * Meta Model API Client configuration and request dispatcher.
 * Kept strictly server-side: META_API_KEY is never exposed to the client.
 */

export const META_API_CONFIG = {
  baseUrl: process.env.META_API_BASE || 'https://api.meta.ai/v1',
  realtimeWsUrl: process.env.META_REALTIME_WS || 'wss://api.meta.ai/v1/asr/realtime',
  apiKey: process.env.META_API_KEY || '',
  voiceModel: process.env.META_VOICE_MODEL || 'muse-voice-transcribe-1.0',
  sparkModel: process.env.META_SPARK_MODEL || 'muse-spark-1.1',
  wonderModel: process.env.META_WONDER_MODEL || 'muse-wonder',
};

export function isMetaConfigured(): boolean {
  return Boolean(META_API_CONFIG.apiKey && META_API_CONFIG.apiKey.trim().length > 0);
}

export async function postMetaApi<T>(
  endpoint: string,
  body: any,
  isMultipart = false
): Promise<{ ok: boolean; status: number; data?: T; error?: string; latencyMs: number }> {
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
      return { ok: false, status: response.status, error: errText, latencyMs };
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
