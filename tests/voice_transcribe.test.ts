
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  writeFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  META_API_CONFIG,
} from '../server/integrations/meta/metaClient';

import {
  transcribeAudio,
} from '../server/integrations/meta/voiceTranscribe';

import {
  AuditRepo,
} from '../server/db/repositories/auditRepo';

describe('Muse Voice Transcribe multipart request', () => {
  it('sends the JSON request part and WAV audio part in multipart form data', async () => {
    const originalApiKey = META_API_CONFIG.apiKey;
    const originalFetch = globalThis.fetch;
    const originalLogApiCall = AuditRepo.logApiCall;

    const temporaryDirectory = mkdtempSync(
      path.join(tmpdir(), 'hakiscribe-voice-test-')
    );

    const audioPath = path.join(
      temporaryDirectory,
      'test-audio.wav'
    );

    const audioContents = Buffer.from('RIFF0000WAVE');

    writeFileSync(audioPath, audioContents);

    let capturedBody: BodyInit | null | undefined;

    try {
      // Use a test-only credential. No real Meta API call is made.
      META_API_CONFIG.apiKey = 'test-only-key';

      // Prevent the test from writing to the actual SQLite database.
      AuditRepo.logApiCall = (call) => ({
        ...call,
        id: 1,
      });

      // Intercept the outgoing HTTP request.
      globalThis.fetch = async (
        _input: RequestInfo | URL,
        init?: RequestInit
      ): Promise<Response> => {
        capturedBody = init?.body;

        return new Response(
          JSON.stringify({
            sessionId: 'test-session-001',
            transcript: 'Test transcription',
            audioDurationMs: 1000,
            turns: [
              {
                turnId: 'turn-001',
                speaker: 'Speaker A',
                startMs: 0,
                endMs: 1000,
                transcript: 'Test transcription',
              },
            ],
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      };

      const result = await transcribeAudio(
        audioPath,
        999999,
        false
      );

      // Verify that the outgoing body is multipart FormData.
      assert.ok(
        capturedBody instanceof FormData,
        'Request body must be FormData'
      );

      const requestPart = capturedBody.get('request');
      const audioPart = capturedBody.get('audio');

      // Verify the JSON configuration part.
      assert.ok(
        requestPart instanceof Blob,
        'Multipart request must contain a request Blob'
      );

      assert.strictEqual(
        requestPart.type,
        'application/json'
      );

      const requestPayload = JSON.parse(
        await requestPart.text()
      );

      assert.deepStrictEqual(requestPayload, {
        mode: 'DIARIZATION',
        model: 'muse-voice-transcribe-1.0',
        audioEncoding: 'WAV',
      });

      // Verify the actual WAV audio part.
      assert.ok(
        audioPart instanceof Blob,
        'Multipart request must contain an audio Blob'
      );

      assert.strictEqual(
        audioPart.type,
        'audio/wav'
      );

      assert.strictEqual(
        audioPart.size,
        audioContents.length
      );

      // Verify successful real-response mapping.
      assert.strictEqual(
        result.source,
        'real'
      );

      assert.strictEqual(
        result.segments.length,
        1
      );

      assert.strictEqual(
        result.segments[0].text_original,
        'Test transcription'
      );

      assert.strictEqual(
        result.segments[0].text_current,
        'Test transcription'
      );

      assert.strictEqual(
        result.segments[0].start_sec,
        0
      );

      assert.strictEqual(
        result.segments[0].end_sec,
        1
      );

      assert.strictEqual(
        result.segments[0].speaker,
        'Speaker A'
      );

      assert.strictEqual(
        result.segments[0].language,
        'und'
      );
    } finally {
      // Restore all modified global and configuration state.
      META_API_CONFIG.apiKey = originalApiKey;
      globalThis.fetch = originalFetch;
      AuditRepo.logApiCall = originalLogApiCall;

      rmSync(temporaryDirectory, {
        recursive: true,
        force: true,
      });
    }
  });
});
