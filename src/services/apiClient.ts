import {
  AIReviewResult,
  ApiResponse,
  ExportDocument,
  RecordingSession,
  ReviewFlag,
  SpeakerRole,
  SpeakerRoleMapping,
  Transcript,
  TranscriptCorrection,
  TranscriptSegment,
} from '../../shared/types';
import { AppStorage } from './storage';

const API_BASE = '/api/v1';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const json: ApiResponse<T> = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || `API request failed with status ${res.status}`);
  }

  return json.data as T;
}

export class ApiClient {
  static async loadDemo(reviewer: string): Promise<RecordingSession> {
    try {
      return await request<RecordingSession>('/sessions/demo', {
        method: 'POST',
        body: JSON.stringify({ reviewer }),
      });
    } catch (err) {
      console.warn('[ApiClient] Falling back to local storage for demo:', err);
      return AppStorage.loadDemoDataset(reviewer) as any;
    }
  }

  static async uploadAudio(
    file: File,
    reviewer: string,
    syntheticAttestation: boolean
  ): Promise<RecordingSession> {
    const formData = new FormData();
    formData.append('audio', file);
    formData.append('reviewer', reviewer);
    formData.append('synthetic_attestation', String(syntheticAttestation));

    const res = await fetch(`${API_BASE}/audio/upload`, {
      method: 'POST',
      body: formData,
    });

    const json: ApiResponse<RecordingSession> = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message || 'Audio upload failed');
    }

    return json.data!;
  }

  static async transcribe(recordingId: number, forceMock = false): Promise<Transcript> {
    try {
      return await request<Transcript>(`/audio/${recordingId}/transcribe`, {
        method: 'POST',
        body: JSON.stringify({ forceMock }),
      });
    } catch (err) {
      console.warn('[ApiClient] Falling back to local storage for transcription:', err);
      const segments = AppStorage.getSegments();
      return {
        recording_id: recordingId,
        segments: segments as any,
        speakers: Array.from(new Set(segments.map((s) => s.speaker))),
        total_segments: segments.length,
        source: 'mock',
      };
    }
  }

  static async getTranscript(recordingId: number): Promise<Transcript> {
    return await request<Transcript>(`/transcripts/${recordingId}`);
  }

  static async runReview(recordingId: number, forceMock = false): Promise<AIReviewResult> {
    try {
      return await request<AIReviewResult>(`/review/${recordingId}/run`, {
        method: 'POST',
        body: JSON.stringify({ forceMock }),
      });
    } catch (err) {
      console.warn('[ApiClient] Falling back to local review execution:', err);
      const flags = AppStorage.getFlags();
      return {
        recording_id: recordingId,
        model: 'muse-spark-mock',
        flags_created: flags.length,
        flags_dropped: 1,
        flags: flags as any,
        created_at: new Date().toISOString(),
      };
    }
  }

  static async getFlags(recordingId: number): Promise<ReviewFlag[]> {
    try {
      return await request<ReviewFlag[]>(`/review/${recordingId}/flags`);
    } catch {
      return AppStorage.getFlags() as any;
    }
  }

  static async editSegment(
    segmentId: number,
    text: string,
    reviewer: string,
    reason: string
  ): Promise<{ segment: TranscriptSegment; correction: TranscriptCorrection }> {
    return await request<{ segment: TranscriptSegment; correction: TranscriptCorrection }>(
      `/transcripts/segments/${segmentId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ text, reviewer, reason }),
      }
    );
  }

  static async decideFlag(
    flagId: number,
    decision: 'ACCEPT' | 'DISMISS' | 'RETAIN',
    reviewer: string,
    reason: string,
    replacementText?: string
  ): Promise<{ flag: ReviewFlag; segment?: TranscriptSegment; correction?: TranscriptCorrection }> {
    return await request(`/review/flags/${flagId}/decide`, {
      method: 'POST',
      body: JSON.stringify({ decision, reviewer, reason, replacementText }),
    });
  }

  static async assignSpeakerRole(
    recordingId: number,
    speakerLabel: string,
    role: SpeakerRole,
    reviewer: string,
    reason?: string
  ): Promise<SpeakerRoleMapping> {
    return await request<SpeakerRoleMapping>(`/review/${recordingId}/roles`, {
      method: 'POST',
      body: JSON.stringify({ speakerLabel, role, reviewer, reason }),
    });
  }

  static async getSpeakerRoles(recordingId: number): Promise<SpeakerRoleMapping[]> {
    try {
      return await request<SpeakerRoleMapping[]>(`/review/${recordingId}/roles`);
    } catch {
      return AppStorage.getSpeakerRoles() as any;
    }
  }

  static async generateDocx(recordingId: number, reviewer: string): Promise<ExportDocument> {
    return await request<ExportDocument>(`/export/${recordingId}/docx`, {
      method: 'POST',
      body: JSON.stringify({ reviewer }),
    });
  }

  static async deleteSession(recordingId: number, reviewer: string, confirmation: string): Promise<void> {
    await request(`/sessions/${recordingId}`, {
      method: 'DELETE',
      body: JSON.stringify({ reviewer, confirmation }),
    });
  }

  static async getHealth(): Promise<any> {
    try {
      return await request('/audit/health');
    } catch {
      return null;
    }
  }

  static async getLedger(): Promise<any[]> {
    try {
      return await request('/audit/ledger');
    } catch {
      return AppStorage.getLedger();
    }
  }
}
