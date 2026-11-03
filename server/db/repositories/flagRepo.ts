import { db } from '../database';
import { FlagStatus, ReviewFlag } from '../../../shared/types';

export class FlagRepo {
  static bulkInsert(flags: Omit<ReviewFlag, 'id'>[]): ReviewFlag[] {
    const stmt = db.prepare(`
      INSERT INTO flags (
        recording_id, segment_id, segment_idx, flag_type,
        severity, message, evidence, suggestion, status,
        resolved_by, resolved_at, reason, related_segment_id,
        prompt_version, evidence_verified, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const inserted: ReviewFlag[] = [];
    const insertTx = db.transaction((items: Omit<ReviewFlag, 'id'>[]) => {
      for (const item of items) {
        const info = stmt.run(
          item.recording_id,
          item.segment_id,
          item.segment_idx,
          item.flag_type,
          item.severity,
          item.message,
          item.evidence,
          item.suggestion,
          item.status,
          item.resolved_by,
          item.resolved_at,
          item.reason,
          item.related_segment_id,
          item.prompt_version,
          item.evidence_verified,
          item.created_at
        );
        inserted.push({ ...item, id: Number(info.lastInsertRowid) });
      }
    });

    insertTx(flags);
    return inserted;
  }

  static getByRecordingId(recordingId: number): ReviewFlag[] {
    return db.prepare(`
      SELECT * FROM flags WHERE recording_id = ? ORDER BY segment_idx ASC, id ASC
    `).all(recordingId) as ReviewFlag[];
  }

  static getById(id: number): ReviewFlag | null {
    return (db.prepare('SELECT * FROM flags WHERE id = ?').get(id) as ReviewFlag) || null;
  }

  static resolve(
    id: number,
    status: FlagStatus,
    reviewer: string,
    reason: string
  ): void {
    db.prepare(`
      UPDATE flags
      SET status = ?, resolved_by = ?, resolved_at = ?, reason = ?
      WHERE id = ?
    `).run(status, reviewer, new Date().toISOString(), reason, id);
  }
}
