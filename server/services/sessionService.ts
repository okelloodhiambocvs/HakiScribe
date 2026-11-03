import { RecordingSession } from '../../shared/types';
import { SessionRepo } from '../db/repositories/sessionRepo';
import { AuditRepo } from '../db/repositories/auditRepo';
import { AudioService } from './audioService';

export class SessionService {
  static createSession(data: {
    filename: string;
    storedPath: string;
    sha256: string;
    sizeBytes: number;
    durationSec: number;
    uploadedBy: string;
    syntheticAttestation: boolean;
    captureSource?: 'upload' | 'live';
  }): RecordingSession {
    if (!data.uploadedBy || !data.uploadedBy.trim()) {
      throw new Error('Reviewer name is required to initialize a recording session.');
    }
    if (!data.syntheticAttestation) {
      throw new Error('Synthetic attestation is strictly required for hackathon court demonstration.');
    }

    const session = SessionRepo.create({
      filename: data.filename,
      stored_path: data.storedPath,
      sha256: data.sha256,
      size_bytes: data.sizeBytes,
      duration_sec: data.durationSec,
      uploaded_by: data.uploadedBy.trim(),
      synthetic_attestation: true,
      transcription_source: null,
      transcription_model: null,
      capture_source: data.captureSource || 'upload',
      status: 'UPLOADED',
      created_at: new Date().toISOString(),
    });

    AuditRepo.logEvent({
      recording_id: session.id,
      actor: data.uploadedBy.trim(),
      action: 'SESSION_CREATED',
      details: `Created session for ${session.filename} (SHA256: ${session.sha256.slice(0, 12)}...)`,
      timestamp: new Date().toISOString(),
    });

    return session;
  }

  static loadDemoSession(reviewer: string): RecordingSession {
    const demoAudioPath = AudioService.getDemoAudioPath();
    return this.createSession({
      filename: 'case-cr-123-2026.wav',
      storedPath: demoAudioPath,
      sha256: '9f8b4a2e5c1d7f0e3b6a9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f',
      sizeBytes: 3676366,
      durationSec: 85.5,
      uploadedBy: reviewer,
      syntheticAttestation: true,
      captureSource: 'upload',
    });
  }

  static getSession(id: number): RecordingSession {
    const session = SessionRepo.getById(id);
    if (!session) {
      throw new Error(`Recording session #${id} not found.`);
    }
    return session;
  }

  static listSessions(): RecordingSession[] {
    return SessionRepo.listAll();
  }

  static deleteSession(id: number, reviewer: string, confirmation: string): void {
    if (!reviewer || !reviewer.trim()) {
      throw new Error('Reviewer name is required to authenticate deletion.');
    }
    if (confirmation.trim().toUpperCase() !== 'DELETE') {
      throw new Error("Must type 'DELETE' to confirm permanent removal.");
    }

    const session = SessionRepo.getById(id);
    if (!session) {
      throw new Error(`Session #${id} does not exist or was already deleted.`);
    }

    SessionRepo.deleteSessionPermanently(id, reviewer.trim());

    AuditRepo.logEvent({
      recording_id: null,
      actor: reviewer.trim(),
      action: 'SESSION_DELETED',
      details: `Permanent deletion of session #${id} (${session.filename}); content-free receipt preserved.`,
      timestamp: new Date().toISOString(),
    });
  }
}
