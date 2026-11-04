import { WebSocket } from 'ws';
import { isMetaConfigured, META_API_CONFIG } from './metaClient';
import { AuditRepo } from '../../db/repositories/auditRepo';

export interface LiveTranscriptEvent {
  type: 'interim' | 'turn_complete' | 'status' | 'error';
  turn?: {
    turn_idx: number;
    speaker: string;
    start_s: number;
    end_s: number;
    text: string;
  };
  partial?: string;
  message?: string;
}

/**
 * Bridge between the browser live-mic socket and Meta's realtime ASR socket.
 *
 * Protocol verified against https://dev.meta.ai/docs/speech-to-text:
 * - Connect to wss://api.meta.ai/v1/asr/realtime (no Authorization header;
 *   the endpoint ignores it) and send a JSON handshake as the FIRST text frame:
 *   { authorization: { accessToken: "Bearer <key>" }, audioEncoding, model,
 *     mode, partialMode, emitAudioProgress, ... }.
 * - Server answers with a handshake ack { sessionId } (no `type` field).
 * - Audio goes in binary frames as raw PCM16 mono (24 kHz preferred).
 * - Completion in DIARIZATION mode arrives as `speechComplete` events;
 *   `speaker` events label the audio behind them within a turn.
 */
export class RealtimeTranscribeBridge {
  private clientWs: WebSocket;
  private metaWs: WebSocket | null = null;
  private mockInterval: NodeJS.Timeout | null = null;
  private turnCount = 0;
  private startTime = Date.now();
  private handshakeAcked = false;
  private lastSpeakerByTurn = new Map<number, string>();
  private lastSpeechStartMsByTurn = new Map<number, number>();
  private usedMock = true;

  constructor(clientWs: WebSocket) {
    this.clientWs = clientWs;
  }

  public initSession(): void {
    if (isMetaConfigured()) {
      try {
        const sessionId = `hakiscribe-live-${Date.now()}`;
        this.metaWs = new WebSocket(
          `${META_API_CONFIG.realtimeWsUrl}?sessionId=${encodeURIComponent(sessionId)}`
        );

        this.metaWs.on('open', () => {
          // Authenticate INSIDE the handshake frame (header is ignored).
          this.metaWs?.send(
            JSON.stringify({
              authorization: { accessToken: `Bearer ${META_API_CONFIG.apiKey}` },
              audioEncoding: 'PCM_24KHZ',
              model: META_API_CONFIG.voiceModel,
              mode: 'DIARIZATION',
              partialMode: 'CUMULATIVE',
              emitAudioProgress: false,
              languageBias: ['English'],
            })
          );
        });

        this.metaWs.on('message', (data: any) => {
          this.handleMetaEvent(data);
        });

        this.metaWs.on('error', (err) => {
          console.warn('Meta Realtime WebSocket error:', err);
          this.fallbackToMockStream('Meta realtime connection error; using demo stream.');
        });

        this.metaWs.on('close', (code) => {
          // 1000 = clean server close after endStream; anything else mid-session
          // means the live path ended unexpectedly.
          if (!this.handshakeAcked || code !== 1000) {
            this.fallbackToMockStream(`Meta realtime socket closed (code ${code}); using demo stream.`);
          }
        });
      } catch (err) {
        console.warn('Failed connecting to Meta WS:', err);
        this.fallbackToMockStream('Meta realtime unreachable; using demo stream.');
      }
    } else {
      this.fallbackToMockStream('No Meta API key configured; using demo stream.');
    }
  }

  public handleAudioChunk(chunk: Buffer | ArrayBuffer): void {
    if (this.metaWs && this.metaWs.readyState === WebSocket.OPEN && this.handshakeAcked) {
      this.metaWs.send(chunk);
    }
  }

  private handleMetaEvent(data: any): void {
    let parsed: any;
    try {
      parsed = JSON.parse(data.toString());
    } catch {
      return; // Ignore non-JSON frames.
    }

    // Handshake acknowledgement has NO `type` field.
    if (!parsed.type && parsed.sessionId) {
      this.handshakeAcked = true;
      this.usedMock = false;
      this.sendClient({
        type: 'status',
        message: 'Connected to Meta Realtime ASR (DIARIZATION, 24kHz PCM)',
      });
      return;
    }

    switch (parsed.type) {
      case 'transcript':
        if (typeof parsed.transcript === 'string' && !parsed.final) {
          this.sendClient({ type: 'interim', partial: parsed.transcript });
        }
        break;
      case 'speechStart':
        if (typeof parsed.turnId === 'number') {
          this.lastSpeechStartMsByTurn.set(parsed.turnId, parsed.audioProcessedMs ?? 0);
        }
        break;
      case 'speaker':
        // Speaker labels attach to the active turn; the client only tracks the
        // latest label per turn (consecutive same-label spans merge server-side).
        if (typeof parsed.label === 'string') {
          const latestTurn = [...this.lastSpeechStartMsByTurn.keys()].pop();
          if (latestTurn !== undefined) this.lastSpeakerByTurn.set(latestTurn, parsed.label);
        }
        break;
      case 'speechComplete': {
        const turnId = typeof parsed.turnId === 'number' ? parsed.turnId : this.turnCount;
        const label = this.lastSpeakerByTurn.get(turnId);
        const speaker = label ? `Speaker ${label}` : `Speaker ${String.fromCharCode(65 + (this.turnCount % 8))}`;
        const endS = typeof parsed.audioProcessedMs === 'number' ? parsed.audioProcessedMs / 1000 : 0;
        const startS = (this.lastSpeechStartMsByTurn.get(turnId) ?? 0) / 1000;
        this.sendClient({
          type: 'turn_complete',
          turn: {
            turn_idx: this.turnCount,
            speaker,
            start_s: startS,
            end_s: endS,
            text: parsed.transcript ?? '',
          },
        });
        this.turnCount++;
        break;
      }
      case 'audioProgress':
        break; // Progress only; not surfaced to the client.
      case 'error':
        console.warn('Meta realtime error event:', parsed.message);
        this.sendClient({ type: 'error', message: parsed.message || 'Meta realtime error' });
        break;
      default:
        break; // Ignore unknown event types for forward compatibility.
    }
  }

  private sendClient(event: LiveTranscriptEvent): void {
    if (this.clientWs.readyState === WebSocket.OPEN) {
      this.clientWs.send(JSON.stringify(event));
    }
  }

  private fallbackToMockStream(reason: string): void {
    if (this.mockInterval) return; // Already in mock mode.
    this.usedMock = true;
    this.handshakeAcked = false;
    if (this.metaWs) {
      try {
        this.metaWs.close();
      } catch {
        /* already closed */
      }
      this.metaWs = null;
    }

    this.sendClient({ type: 'status', message: reason });

    const mockTurns = [
      { speaker: 'Speaker A', start_s: 0.5, end_s: 3.8, text: 'Mahakama imeanza kikao cha asubuhi.' },
      { speaker: 'Speaker B', start_s: 4.2, end_s: 8.5, text: 'Mheshimiwa, tuna kesi ya jinai namba 45 ya Nakuru.' },
      { speaker: 'Speaker C', start_s: 9.0, end_s: 13.7, text: 'The accused pleads not guilty to the charge of trespass.' },
      { speaker: 'Speaker A', start_s: 14.1, end_s: 18.9, text: 'Mention date is set for fourteenth of January next year.' },
    ];

    let step = 0;
    this.mockInterval = setInterval(() => {
      if (this.clientWs.readyState !== WebSocket.OPEN) {
        this.close();
        return;
      }

      if (step < mockTurns.length) {
        const turn = mockTurns[step];
        this.sendClient({
          type: 'turn_complete',
          turn: {
            turn_idx: step,
            speaker: turn.speaker,
            start_s: turn.start_s,
            end_s: turn.end_s,
            text: turn.text,
          },
        });
        step++;
      }
    }, 4000);
  }

  public close(): void {
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
      this.mockInterval = null;
    }
    if (this.metaWs) {
      try {
        // End input explicitly so the server can flush pending results, then close.
        if (this.metaWs.readyState === WebSocket.OPEN && this.handshakeAcked) {
          this.metaWs.send(JSON.stringify({ type: 'endStream' }));
        }
      } catch {
        /* best effort */
      }
      this.metaWs.close();
      this.metaWs = null;
    }

    const elapsed = Math.round((Date.now() - this.startTime) / 1000);
    AuditRepo.logApiCall({
      timestamp: new Date().toISOString(),
      service: 'muse-voice-transcribe-1.0',
      model: this.usedMock ? 'mock-stream' : META_API_CONFIG.voiceModel,
      endpoint: '/asr/realtime',
      status: this.usedMock ? 'MOCK' : 'SUCCESS',
      duration_ms: elapsed * 1000,
      note: `Realtime live session closed (${elapsed}s elapsed, ${this.turnCount} live turns)`,
    });
  }
}
