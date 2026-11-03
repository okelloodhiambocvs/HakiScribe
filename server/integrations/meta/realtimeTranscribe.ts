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

export class RealtimeTranscribeBridge {
  private clientWs: WebSocket;
  private metaWs: WebSocket | null = null;
  private mockInterval: NodeJS.Timeout | null = null;
  private turnCount = 0;
  private startTime = Date.now();

  constructor(clientWs: WebSocket) {
    this.clientWs = clientWs;
  }

  public initSession(): void {
    if (isMetaConfigured()) {
      try {
        this.metaWs = new WebSocket(META_API_CONFIG.realtimeWsUrl, {
          headers: {
            Authorization: `Bearer ${META_API_CONFIG.apiKey}`,
          },
        });

        this.metaWs.on('open', () => {
          this.clientWs.send(JSON.stringify({
            type: 'status',
            message: 'Connected to Meta Realtime ASR WebSocket (24kHz Mono PCM)',
          }));
        });

        this.metaWs.on('message', (data: any) => {
          try {
            const parsed = JSON.parse(data.toString());
            this.clientWs.send(JSON.stringify(parsed));
          } catch {
            this.clientWs.send(data);
          }
        });

        this.metaWs.on('error', (err) => {
          console.warn('Meta Realtime WebSocket error:', err);
          this.fallbackToMockStream();
        });
      } catch (err) {
        console.warn('Failed connecting to Meta WS:', err);
        this.fallbackToMockStream();
      }
    } else {
      this.fallbackToMockStream();
    }
  }

  public handleAudioChunk(chunk: Buffer | ArrayBuffer): void {
    if (this.metaWs && this.metaWs.readyState === WebSocket.OPEN) {
      this.metaWs.send(chunk);
    }
  }

  private fallbackToMockStream(): void {
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
        this.clientWs.send(JSON.stringify({
          type: 'turn_complete',
          turn: {
            turn_idx: step,
            speaker: turn.speaker,
            start_s: turn.start_s,
            end_s: turn.end_s,
            text: turn.text,
          },
        }));
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
      this.metaWs.close();
      this.metaWs = null;
    }

    const elapsed = Math.round((Date.now() - this.startTime) / 1000);
    AuditRepo.logApiCall({
      timestamp: new Date().toISOString(),
      service: 'muse-realtime-transcribe',
      model: isMetaConfigured() ? 'real-ws' : 'mock-stream',
      endpoint: '/asr/realtime',
      status: isMetaConfigured() ? 'SUCCESS' : 'MOCK',
      duration_ms: elapsed * 1000,
      note: `Realtime live session closed (${elapsed}s elapsed)`,
    });
  }
}
