import { db } from '../database';
import { TranscriptCorrection } from '../../../shared/types';

export class CorrectionRepo {
  static create(data: Omit<TranscriptCorrection, 'id'>): TranscriptCorrection {
    const stmt = db.prepare(`
      INSERT INTO corrections (
        recording_id, segment_id, field, before_text,
        after_text, reviewer_name, decision, reason, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      data.recording_id,
      data.segment_id,
      data.field,
      data.before_text,
      data.after_text,
      data.reviewer_name,
      data.decision,
      data.reason,
      data.created_at
    );

    return { ...data, id: Number(info.lastInsertRowid) };
  }

  static getByRecordingId(recordingId: number): TranscriptCorrection[] {
    return db.prepare(`
      SELECT * FROM corrections WHERE recording_id = ? ORDER BY id DESC
    `).all(recordingId) as TranscriptCorrection[];
  }

  static getBySegmentId(segmentId: number): TranscriptCorrection[] {
    return db.prepare(`
      SELECT * FROM corrections WHERE segment_id = ? ORDER BY id DESC
    `).all(segmentId) as TranscriptCorrection[];
  }
}
