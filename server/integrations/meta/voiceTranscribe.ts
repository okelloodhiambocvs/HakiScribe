import fs from 'fs';
import { TranscriptSegment } from '../../../shared/types';
import {
  isMetaConfigured,
  META_API_CONFIG,
  postMetaApi,
} from './metaClient';
import { AuditRepo } from '../../db/repositories/auditRepo';

export interface MetaTurnResponse {
  turnId: string;
  startMs: number;
  endMs: number;
  transcript: string;
  speaker?: string;
}

export interface MetaTranscribeResponse {
  sessionId: string;
  transcript: string;
  audioDurationMs: number;
  turns: MetaTurnResponse[];
}

// Court-domain vocabulary biasing so the model recognises Kenyan legal terms.
// Per docs, keywords bias recognition but do not guarantee exact spelling.
const COURT_KEYWORDS = [
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
];

export interface WavFormatCheck {
  valid: boolean;
  reason?: string;
  durationSec?: number;
}

/**
 * Best-effort validation that a file meets the Meta /asr/transcribe contract:
 * RIFF/WAVE container, mono, 16-bit integer PCM at 16 kHz or 24 kHz.
 * Never throws: unparseable files report valid=false.
 */
export function checkWavFormat(filePath: string): WavFormatCheck {
  try {
    const fd = fs.openSync(filePath, 'r');
    try {
      const header = Buffer.alloc(44);
      const bytesRead = fs.readSync(fd, header, 0, 44, 0);
      if (bytesRead < 44) return { valid: false, reason: 'file smaller than a WAV header (44 bytes)' };
      if (header.toString('ascii', 0, 4) !== 'RIFF' || header.toString('ascii', 8, 12) !== 'WAVE') {
        return { valid: false, reason: 'not a RIFF/WAVE container' };
      }
      const channels = header.readUInt16LE(22);
      const sampleRate = header.readUInt32LE(24);
      const bitsPerSample = header.readUInt16LE(34);
      if (channels !== 1) return { valid: false, reason: `expected mono audio, found ${channels} channels` };
      if (bitsPerSample !== 16) return { valid: false, reason: `expected 16-bit PCM, found ${bitsPerSample}-bit` };
      if (sampleRate !== 16000 && sampleRate !== 24000) {
        return { valid: false, reason: `expected 16 kHz or 24 kHz, found ${sampleRate} Hz` };
      }
      const stat = fs.fstatSync(fd);
      const dataBytes = Math.max(0, stat.size - 44);
      const durationSec = dataBytes / (sampleRate * 2); // mono 16-bit = 2 bytes/sample
      if (durationSec > 600) {
        return { valid: false, reason: `audio exceeds 10-minute API cap (${durationSec.toFixed(0)}s)` };
      }
      return { valid: true, durationSec };
    } finally {
      fs.closeSync(fd);
    }
  } catch (err: any) {
    return { valid: false, reason: err?.message || 'unreadable audio file' };
  }
}

// Built-in synthetic demonstration turns for Case CR 123/2026
const SYNTHETIC_DEMO_TURNS: Omit<TranscriptSegment, 'id' | 'recording_id'>[] = [
  { idx: 0, speaker: 'Speaker A', speaker_label: 'Speaker A', start_sec: 0.4, end_sec: 4.2, text_original: 'Court is now in session. Case number CR 123 of 2026.', text_current: 'Court is now in session. Case number CR 123 of 2026.', confidence: null, language: 'en' },
  { idx: 1, speaker: 'Speaker B', speaker_label: 'Speaker B', start_sec: 4.5, end_sec: 8.1, text_original: 'Mheshimiwa, mshtakiwa yupo kotini leo.', text_current: 'Mheshimiwa, mshtakiwa yupo kotini leo.', confidence: null, language: 'sw' },
  { idx: 2, speaker: 'Speaker C', speaker_label: 'Speaker C', start_sec: 8.4, end_sec: 14.1, text_original: 'The accused is charged with theft contrary to Section 268 of the Penal Code.', text_current: 'The accused is charged with theft contrary to Section 268 of the Penal Code.', confidence: null, language: 'en' },
  { idx: 3, speaker: 'Speaker D', speaker_label: 'Speaker D', start_sec: 14.4, end_sec: 18.5, text_original: 'Si kweli, mimi sikuwa hapo tarehe kumi na mbili.', text_current: 'Si kweli, mimi sikuwa hapo tarehe kumi na mbili.', confidence: null, language: 'sw' },
  { idx: 4, speaker: 'Speaker A', speaker_label: 'Speaker A', start_sec: 18.8, end_sec: 23.2, text_original: 'Plea of not guilty entered. Mention on 20 November 2026.', text_current: 'Plea of not guilty entered. Mention on 20 November 2026.', confidence: null, language: 'en' },
  { idx: 5, speaker: 'Speaker E', speaker_label: 'Speaker E', start_sec: 23.5, end_sec: 27.8, text_original: 'Mheshimiwa, naomba dhamana kwa mteja wangu.', text_current: 'Mheshimiwa, naomba dhamana kwa mteja wangu.', confidence: null, language: 'sw' },
  { idx: 6, speaker: 'Speaker C', speaker_label: 'Speaker C', start_sec: 28.1, end_sec: 33.6, text_original: 'The prosecution opposes bail, Mheshimiwa. The complainant fears interference.', text_current: 'The prosecution opposes bail, Mheshimiwa. The complainant fears interference.', confidence: null, language: 'en-sw' },
  { idx: 7, speaker: 'Speaker E', speaker_label: 'Speaker E', start_sec: 34.0, end_sec: 39.5, text_original: 'My client has a fixed home and will attend every mention, Mheshimiwa.', text_current: 'My client has a fixed home and will attend every mention, Mheshimiwa.', confidence: null, language: 'en-sw' },
  { idx: 8, speaker: 'Speaker F', speaker_label: 'Speaker F', start_sec: 40.0, end_sec: 45.8, text_original: 'Nilikuwa nyumbani saa mbili usiku, and then I heard the gate open.', text_current: 'Nilikuwa nyumbani saa mbili usiku, and then I heard the gate open.', confidence: null, language: 'sw-en' },
  { idx: 9, speaker: 'Speaker G', speaker_label: 'Speaker G', start_sec: 46.2, end_sec: 50.4, text_original: 'Nalimwona, he was running towards the main road.', text_current: 'Nalimwona, he was running towards the main road.', confidence: null, language: 'sw-en' },
  { idx: 10, speaker: 'Speaker H', speaker_label: 'Speaker H', start_sec: 50.8, end_sec: 55.6, text_original: 'The witness says he saw the accused running, Mheshimiwa.', text_current: 'The witness says he saw the accused running, Mheshimiwa.', confidence: null, language: 'en-sw' },
  { idx: 11, speaker: 'Speaker I', speaker_label: 'Speaker I', start_sec: 56.0, end_sec: 62.0, text_original: 'We recovered a bag near the shop, and the complainant identified it.', text_current: 'We recovered a bag near the shop, and the complainant identified it.', confidence: null, language: 'en' },
  { idx: 12, speaker: 'Speaker J', speaker_label: 'Speaker J', start_sec: 62.5, end_sec: 67.8, text_original: 'I was at the kiosk across the road, nikasikia kelele kubwa.', text_current: 'I was at the kiosk across the road, nikasikia kelele kubwa.', confidence: null, language: 'en-sw' },
  { idx: 13, speaker: 'Speaker C', speaker_label: 'Speaker C', start_sec: 68.2, end_sec: 73.1, text_original: 'Mheshimiwa, tunahitaji wiki mbili kukamilisha upelelezi.', text_current: 'Mheshimiwa, tunahitaji wiki mbili kukamilisha upelelezi.', confidence: null, language: 'sw' },
  { idx: 14, speaker: 'Speaker B', speaker_label: 'Speaker B', start_sec: 73.5, end_sec: 78.4, text_original: 'Mheshimiwa, karani amerekodi ushahidi wote wa leo.', text_current: 'Mheshimiwa, karani amerekodi ushahidi wote wa leo.', confidence: null, language: 'sw' },
  { idx: 15, speaker: 'Speaker A', speaker_label: 'Speaker A', start_sec: 78.8, end_sec: 85.5, text_original: 'The record is complete. Ruling on bail on 27 November 2026. Court is adjourned.', text_current: 'The record is complete. Ruling on bail on 27 November 2026. Court is adjourned.', confidence: null, language: 'en' },
];

export async function transcribeAudio(
  filePath: string,
  recordingId: number,
  forceMock = false
): Promise<{
  segments: Omit<TranscriptSegment, 'id'>[];
  source: 'real' | 'mock';
  model: string;
}> {
  const attemptedReal = !forceMock && isMetaConfigured();

  // Check if real call requested and configured
  if (attemptedReal) {
    const formatCheck = checkWavFormat(filePath);
    if (!formatCheck.valid) {
      const reason = formatCheck.reason || 'unsupported audio format';
      console.warn(`Real Meta Voice Transcribe skipped (${reason}); falling back to synthetic mock turns.`);
      AuditRepo.logApiCall({
        timestamp: new Date().toISOString(),
        service: META_API_CONFIG.voiceModel,
        model: META_API_CONFIG.voiceModel,
        endpoint: '/asr/transcribe',
        status: 'FAILED',
        duration_ms: 0,
        note: `Pre-check failed (${reason}); API requires mono 16-bit PCM WAV at 16/24 kHz under 10 minutes. Served synthetic fallback.`,
      });
    } else {
      try {
        const formData = new FormData();

        const fileBuffer = fs.readFileSync(filePath);

        const audioBlob = new Blob([fileBuffer], {
          type: 'audio/wav',
        });

        // Same settings shape as the realtime handshake, minus `authorization`.
        // languageBias steers recognition; Kiswahili is not in the 25 supported
        // languages, so we bias toward English and let the model detect the rest.
        const requestPayload = {
          mode: 'DIARIZATION',
          model: META_API_CONFIG.voiceModel,
          audioEncoding: 'WAV',
          languageBias: ['English'],
          keywords: COURT_KEYWORDS,
        };

        const requestBlob = new Blob(
          [JSON.stringify(requestPayload)],
          { type: 'application/json' }
        );

        formData.append('request', requestBlob, 'request.json');
        formData.append('audio', audioBlob, 'court_proceeding.wav');

        const sessionId = `hakiscribe-${recordingId}-${Date.now()}`;
        const result = await postMetaApi<MetaTranscribeResponse>(
          `/asr/transcribe?sessionId=${encodeURIComponent(sessionId)}`,
          formData,
          true
        );

        if (
          result.ok &&
          result.data &&
          Array.isArray(result.data.turns) &&
          result.data.turns.length > 0
        ) {
          AuditRepo.logApiCall({
            timestamp: new Date().toISOString(),
            service: META_API_CONFIG.voiceModel,
            model: META_API_CONFIG.voiceModel,
            endpoint: '/asr/transcribe',
            status: 'SUCCESS',
            duration_ms: result.latencyMs,
            note: `Transcribed ${result.data.turns.length} turns with DIARIZATION mode`,
          });

          const segments: Omit<TranscriptSegment, 'id'>[] =
            result.data.turns.map((turn, i) => ({
              recording_id: recordingId,
              idx: i,
              speaker:
                turn.speaker ||
                `Speaker ${String.fromCharCode(65 + (i % 8))}`,
              speaker_label:
                turn.speaker ||
                `Speaker ${String.fromCharCode(65 + (i % 8))}`,
              start_sec: turn.startMs / 1000,
              end_sec: turn.endMs / 1000,
              text_original: turn.transcript,
              text_current: turn.transcript,
              confidence: null,
              language: 'und',
            }));

          return {
            segments,
            source: 'real',
            model: META_API_CONFIG.voiceModel,
          };
        }

        const realError = result.error || 'empty turns array in Meta response';
        console.warn('Real Meta Voice Transcribe call failed; falling back to synthetic mock turns:', realError);
        AuditRepo.logApiCall({
          timestamp: new Date().toISOString(),
          service: META_API_CONFIG.voiceModel,
          model: META_API_CONFIG.voiceModel,
          endpoint: '/asr/transcribe',
          status: 'FAILED',
          duration_ms: result.latencyMs,
          note: `Meta call failed (HTTP ${result.status}: ${realError.slice(0, 160)}); served synthetic fallback.`,
        });
      } catch (err: any) {
        const realError = err?.message || 'Unknown Meta Voice Transcribe error';
        console.warn(
          'Real Meta Voice Transcribe call failed; falling back to synthetic mock turns:',
          realError
        );
        AuditRepo.logApiCall({
          timestamp: new Date().toISOString(),
          service: META_API_CONFIG.voiceModel,
          model: META_API_CONFIG.voiceModel,
          endpoint: '/asr/transcribe',
          status: 'FAILED',
          duration_ms: 0,
          note: `Meta call threw (${realError.slice(0, 160)}); served synthetic fallback.`,
        });
      }
    }
  }

  // Fallback to synthetic demonstration mode
  AuditRepo.logApiCall({
    timestamp: new Date().toISOString(),
    service: META_API_CONFIG.voiceModel,
    model: 'synthetic-diarization-mock',
    endpoint: '/asr/transcribe',
    status: 'MOCK',
    duration_ms: 120,
    note: 'Generated synthetic diarized courtroom turns (CR 123/2026)',
  });

  const segments: Omit<TranscriptSegment, 'id'>[] =
    SYNTHETIC_DEMO_TURNS.map((t) => ({
      ...t,
      recording_id: recordingId,
    }));

  return {
    segments,
    source: 'mock',
    model: 'muse-voice-transcribe-mock',
  };
}
