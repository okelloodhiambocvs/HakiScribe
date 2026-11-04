
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  META_API_CONFIG,
  chatCompletionJson,
  extractChatContent,
  metaKeySource,
  parseModelJson,
} from '../server/integrations/meta/metaClient';
import { runSparkReview } from '../server/integrations/meta/sparkReview';
import { generateWonderSummary } from '../server/integrations/meta/wonderSummary';
import { AuditRepo } from '../server/db/repositories/auditRepo';
import { TranscriptSegment } from '../shared/types';

function chatEnvelope(content: string, model = 'muse-spark-1.3') {
  return {
    id: 'chatcmpl-test',
    model,
    choices: [{ message: { role: 'assistant', content }, finish_reason: 'stop' }],
  };
}

function demoSegments(): TranscriptSegment[] {
  return [
    {
      id: 101, recording_id: 7, idx: 0,
      speaker: 'Speaker A', speaker_label: 'Speaker A',
      start_sec: 0.4, end_sec: 4.2,
      text_original: 'Court is now in session. Case number CR 123 of 2026.',
      text_current: 'Court is now in session. Case number CR 123 of 2026.',
      confidence: null, language: 'en',
    },
    {
      id: 102, recording_id: 7, idx: 1,
      speaker: 'Speaker B', speaker_label: 'Speaker B',
      start_sec: 4.5, end_sec: 8.1,
      text_original: 'Mheshimiwa, mshtakiwa yupo kotini leo.',
      text_current: 'Mheshimiwa, mshtakiwa yupo kotini leo.',
      confidence: null, language: 'sw',
    },
  ];
}

describe('Meta Chat Completions envelope handling', () => {
  const savedEnv = { META_API_KEY: process.env.META_API_KEY, MODEL_API_KEY: process.env.MODEL_API_KEY };
  const originalApiKey = META_API_CONFIG.apiKey;
  const originalFetch = globalThis.fetch;
  const originalLogApiCall = AuditRepo.logApiCall;
  const ledgerStatuses: string[] = [];
  let capturedUrl = '';
  let capturedBody: any = null;

  beforeEach(() => {
    delete process.env.META_API_KEY;
    delete process.env.MODEL_API_KEY;
    META_API_CONFIG.apiKey = 'test-only-key';
    ledgerStatuses.length = 0;
    capturedUrl = '';
    capturedBody = null;
    AuditRepo.logApiCall = (call) => {
      ledgerStatuses.push(call.status);
      return { ...call, id: 1 };
    };
  });

  afterEach(() => {
    META_API_CONFIG.apiKey = originalApiKey;
    globalThis.fetch = originalFetch;
    AuditRepo.logApiCall = originalLogApiCall;
    if (savedEnv.META_API_KEY !== undefined) process.env.META_API_KEY = savedEnv.META_API_KEY;
    if (savedEnv.MODEL_API_KEY !== undefined) process.env.MODEL_API_KEY = savedEnv.MODEL_API_KEY;
  });

  function stubFetchJson(payload: unknown, status = 200) {
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(input);
      capturedBody = JSON.parse(String(init?.body || '{}'));
      return new Response(JSON.stringify(payload), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;
  }

  it('extracts message content from the OpenAI-style envelope', () => {
    assert.strictEqual(extractChatContent(chatEnvelope('hello')), 'hello');
    assert.strictEqual(extractChatContent({ choices: [] }), null);
    assert.strictEqual(extractChatContent({}), null);
    assert.strictEqual(extractChatContent(null), null);
  });

  it('parses raw and fenced model JSON, rejecting non-JSON', () => {
    assert.deepStrictEqual(parseModelJson<{ a: number }>('{"a":1}'), { a: 1 });
    assert.deepStrictEqual(parseModelJson<{ a: number }>('```json\n{"a":1}\n```'), { a: 1 });
    assert.strictEqual(parseModelJson('just prose, no json'), null);
  });

  it('posts to /chat/completions with json_schema response_format and returns parsed JSON', async () => {
    stubFetchJson(chatEnvelope('{"verdict":"ok"}'));
    const result = await chatCompletionJson<{ verdict: string }>({
      model: 'muse-spark-1.3',
      developer: 'd',
      user: 'u',
      schemaName: 'S',
      schema: { type: 'object' },
    });
    assert.strictEqual(result.ok, true);
    assert.deepStrictEqual(result.data, { verdict: 'ok' });
    assert.match(capturedUrl, /\/chat\/completions$/);
    assert.strictEqual(capturedBody.response_format.type, 'json_schema');
    assert.deepStrictEqual(
      capturedBody.messages.map((m: any) => m.role),
      ['developer', 'user']
    );
  });

  it('reports failure when the envelope has no message content', async () => {
    stubFetchJson({ choices: [] });
    const result = await chatCompletionJson<{ verdict: string }>({
      model: 'muse-spark-1.3',
      developer: 'd',
      user: 'u',
      schemaName: 'S',
      schema: { type: 'object' },
    });
    assert.strictEqual(result.ok, false);
    assert.match(result.error || '', /no message content/);
  });

  it('Spark review sends transcript text, keeps quoted flags, drops hallucinations', async () => {
    stubFetchJson(
      chatEnvelope(
        JSON.stringify({
          flags: [
            {
              segment_idx: 0,
              type: 'NUMBER_OR_DATE',
              severity: 'HIGH',
              evidence: 'CR 123 of 2026',
              message: 'Verify case number against charge sheet.',
            },
            {
              segment_idx: 0,
              type: 'INCONSISTENCY',
              severity: 'LOW',
              evidence: 'MADE UP PHRASE',
              message: 'Hallucinated flag that must be dropped.',
            },
          ],
        })
      )
    );

    const result = await runSparkReview(7, demoSegments(), false);

    // The model must actually receive the transcript under review.
    const userMessage = capturedBody.messages.find((m: any) => m.role === 'user').content as string;
    assert.match(userMessage, /CR 123 of 2026/);
    assert.match(userMessage, /Mheshimiwa, mshtakiwa yupo kotini leo/);

    assert.strictEqual(result.flagsCreated, 1);
    assert.strictEqual(result.flagsDropped, 1);
    assert.strictEqual(result.flags[0].evidence, 'CR 123 of 2026');
    assert.strictEqual(result.flags[0].evidence_verified, 1);
    assert.deepStrictEqual(ledgerStatuses, ['SUCCESS']);
  });

  it('Spark review falls back honestly with FAILED status when the Meta call errors', async () => {
    globalThis.fetch = (async () => {
      throw new Error('simulated outage');
    }) as typeof fetch;

    const result = await runSparkReview(7, demoSegments(), false);

    assert.ok(result.flagsCreated >= 1); // deterministic fallback still serves the demo
    assert.strictEqual(result.model, 'muse-spark-mock');
    assert.deepStrictEqual(ledgerStatuses, ['FAILED']);
  });

  it('Wonder summary parses bilingual JSON from the envelope', async () => {
    stubFetchJson(
      chatEnvelope(
        JSON.stringify({ summary_en: 'English draft.', summary_sw: 'Rasimu ya Kiswahili.' }),
        'muse-wonder-1.0'
      )
    );

    const result = await generateWonderSummary(demoSegments(), false);

    assert.strictEqual(result.summaryEn, 'English draft.');
    assert.strictEqual(result.summarySw, 'Rasimu ya Kiswahili.');
    assert.strictEqual(result.model, META_API_CONFIG.wonderModel);
    const userMessage = capturedBody.messages.find((m: any) => m.role === 'user').content as string;
    assert.match(userMessage, /CR 123 of 2026/);
    assert.deepStrictEqual(ledgerStatuses, ['SUCCESS']);
  });

  it('Wonder summary falls back honestly with FAILED status on invalid model JSON', async () => {
    stubFetchJson(chatEnvelope('not json at all'));

    const result = await generateWonderSummary(demoSegments(), false);

    assert.strictEqual(result.model, 'muse-wonder-mock');
    assert.match(result.summaryEn, /CR 123 of 2026/);
    assert.deepStrictEqual(ledgerStatuses, ['FAILED']);
  });

  it('accepts MODEL_API_KEY (documented name) as a key source', () => {
    META_API_CONFIG.apiKey = '';
    process.env.MODEL_API_KEY = 'LLM_test_key';
    assert.strictEqual(metaKeySource(), 'MODEL_API_KEY');
  });
});
