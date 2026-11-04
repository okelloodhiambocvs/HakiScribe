
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
  checkWavFormat,
  transcribeAudio,
} from '../server/integrations/meta/voiceTranscribe';

import {
  AuditRepo,
} from '../server/db/repositories/auditRepo';

/** Build a minimal valid mono 16-bit PCM WAV buffer (16 kHz default). */
function buildValidWav(sampleRate = 16000, channels = 1, bitsPerSample = 16, seconds = 1): Buffer {
  const dataBytes = sampleRate * channels * (bitsPerSample / 8) * seconds;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataBytes, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * (bitsPerSample / 8), 28);
  header.writeUInt16LE(channels * (bitsPerSample / 8), 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataBytes, 40);
  return Buffer.concat([header, Buffer.alloc(dataBytes)]);
}

describe('Muse Voice Transcribe WAV pre-check', () => {
  it('accepts mono 16-bit PCM WAV at 16 kHz', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'hakiscribe-wav-test-'));
    try {
      const audioPath = path.join(dir, 'valid.wav');
      writeFileSync(audioPath, buildValidWav());
      const check = checkWavFormat(audioPath);
      assert.strictEqual(check.valid, true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects stereo audio with an explicit reason', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'hakiscribe-wav-test-'));
    try {
      const audioPath = path.join(dir, 'stereo.wav');
      writeFileSync(audioPath, buildValidWav(16000, 2));
      const check = checkWavFormat(audioPath);
      assert.strictEqual(check.valid, false);
      assert.match(check.reason || '', /mono/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects non-WAV uploads with an explicit reason', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'hakiscribe-wav-test-'));
    try {
      const audioPath = path.join(dir, 'fake.mp3');
      writeFileSync(audioPath, Buffer.from('ID3-not-a-wav-file-at-all-padded-out-to-44-bytes!!'));
      const check = checkWavFormat(audioPath);
      assert.strictEqual(check.valid, false);
      assert.match(check.reason || '', /RIFF\/WAVE/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

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

    const audioContents = buildValidWav();

    writeFileSync(audioPath, audioContents);

    let capturedBody: BodyInit | null | undefined;
    let capturedUrl: string | URL | Request = '';

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
        input: RequestInfo | URL,
        init?: RequestInit
      ): Promise<Response> => {
        capturedUrl = input as string;
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

      // Verify the sessionId query parameter is attached for log correlation.
      assert.match(
        String(capturedUrl),
        /\/asr\/transcribe\?sessionId=hakiscribe-999999-/
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
        languageBias: ['English'],
        keywords: [
          'Mheshimiwa',
          'Penal Code',
          'bail',
          'mention',
          'complainant',
          'prosecution',
          'magistrate',
          'adjourned',
          'surety',
          'plea',
        ],
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

  it('falls back to mock with a FAILED ledger entry when the Meta call errors', async () => {
    const originalApiKey = META_API_CONFIG.apiKey;
    const originalFetch = globalThis.fetch;
    const originalLogApiCall = AuditRepo.logApiCall;

    const temporaryDirectory = mkdtempSync(
      path.join(tmpdir(), 'hakiscribe-voice-test-')
    );
    const audioPath = path.join(temporaryDirectory, 'test-audio.wav');
    writeFileSync(audioPath, buildValidWav());

    const ledgerStatuses: string[] = [];
    try {
      META_API_CONFIG.apiKey = 'test-only-key';
      AuditRepo.logApiCall = (call) => {
        ledgerStatuses.push(call.status);
        return { ...call, id: 1 };
      };
      globalThis.fetch = async (): Promise<Response> => {
        throw new Error('simulated network outage');
      };

      const result = await transcribeAudio(audioPath, 999999, false);

      assert.strictEqual(result.source, 'mock');
      assert.ok(result.segments.length > 0);
      // Honest ledger: the provider failure is recorded, then the mock fallback.
      assert.deepStrictEqual(ledgerStatuses, ['FAILED', 'MOCK']);
    } finally {
      META_API_CONFIG.apiKey = originalApiKey;
      globalThis.fetch = originalFetch;
      AuditRepo.logApiCall = originalLogApiCall;
      rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });
});
