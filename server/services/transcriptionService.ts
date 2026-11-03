import { Transcript, TranscriptSegment } from '../../shared/types';
import { SessionRepo } from '../db/repositories/sessionRepo';
import { SegmentRepo } from '../db/repositories/segmentRepo';
import { AuditRepo } from '../db/repositories/auditRepo';
import { transcribeAudio } from '../integrations/meta/voiceTranscribe';

export class TranscriptionService {
  static async transcribeSession(
    recordingId: number,
    forceMock = false
  ): Promise<Transcript> {
    const session = SessionRepo.getById(recordingId);
    if (!session) {
      throw new Error(`Recording session #${recordingId} not found.`);
    }

    // Check if already transcribed
    const existingSegments = SegmentRepo.getByRecordingId(recordingId);
    if (existingSegments.length > 0) {
      return {
        recording_id: recordingId,
        segments: existingSegments,
        speakers: Array.from(new Set(existingSegments.map((s) => s.speaker))),
        total_segments: existingSegments.length,
        source: session.transcription_source || 'mock',
      };
    }

    SessionRepo.updateStatus(recordingId, 'TRANSCRIBING');

    const result = await transcribeAudio(session.stored_path, recordingId, forceMock);
    const inserted = SegmentRepo.bulkInsert(result.segments);

    SessionRepo.updateStatus(recordingId, 'TRANSCRIBED', result.source, result.model);

    AuditRepo.logEvent({
      recording_id: recordingId,
      actor: session.uploaded_by,
      action: 'TRANSCRIPTION_COMPLETED',
      details: `Transcribed ${inserted.length} turns using ${result.model} (${result.source} mode)`,
      timestamp: new Date().toISOString(),
    });

    const speakers = Array.from(new Set(inserted.map((s) => s.speaker)));

    return {
      recording_id: recordingId,
      segments: inserted,
      speakers,
      total_segments: inserted.length,
      source: result.source,
    };
  }

  static getTranscript(recordingId: number): Transcript {
    const session = SessionRepo.getById(recordingId);
    if (!session) {
      throw new Error(`Recording session #${recordingId} not found.`);
    }

    const segments = SegmentRepo.getByRecordingId(recordingId);
    const speakers = Array.from(new Set(segments.map((s) => s.speaker)));

    return {
      recording_id: recordingId,
      segments,
      speakers,
      total_segments: segments.length,
      source: session.transcription_source || 'mock',
    };
  }
}
