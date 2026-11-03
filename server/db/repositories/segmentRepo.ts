import { db } from '../database';
import { TranscriptSegment } from '../../../shared/types';

export class SegmentRepo {
  static bulkInsert(segments: Omit<TranscriptSegment, 'id'>[]): TranscriptSegment[] {
    const stmt = db.prepare(`
      INSERT INTO segments (
        recording_id, idx, start_sec, end_sec, speaker,
        speaker_label, confidence, language, text_original,
        text_current, is_approximate, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const inserted: TranscriptSegment[] = [];
    const now = new Date().toISOString();

    const insertTx = db.transaction((items: Omit<TranscriptSegment, 'id'>[]) => {
      for (const item of items) {
        const info = stmt.run(
          item.recording_id,
          item.idx,
          item.start_sec,
          item.end_sec,
          item.speaker,
          item.speaker_label,
          item.confidence,
          item.language,
          item.text_original,
          item.text_current,
          item.is_approximate ? 1 : 0,
          now,
          now
        );
        inserted.push({ ...item, id: Number(info.lastInsertRowid) });
      }
    });

    insertTx(segments);
    return inserted;
  }

  static getByRecordingId(recordingId: number): TranscriptSegment[] {
    const rows = db.prepare(`
      SELECT * FROM segments WHERE recording_id = ? ORDER BY idx ASC
    `).all(recordingId) as any[];

    return rows.map((r) => ({
      ...r,
      is_approximate: Boolean(r.is_approximate),
    }));
  }

  static getById(id: number): TranscriptSegment | null {
    const row = db.prepare('SELECT * FROM segments WHERE id = ?').get(id) as any;
    if (!row) return null;
    return {
      ...row,
      is_approximate: Boolean(row.is_approximate),
    };
  }

  static updateText(id: number, newText: string): void {
    db.prepare(`
      UPDATE segments
      SET text_current = ?, updated_at = ?
      WHERE id = ?
    `).run(newText, new Date().toISOString(), id);
  }

  static updateSpeakerRoleForLabel(recordingId: number, speakerLabel: string, newRole: string): void {
    db.prepare(`
      UPDATE segments
      SET speaker = ?, updated_at = ?
      WHERE recording_id = ? AND speaker_label = ?
    `).run(newRole, new Date().toISOString(), recordingId, speakerLabel);
  }

  static resetSpeakerForLabel(recordingId: number, speakerLabel: string): void {
    db.prepare(`
      UPDATE segments
      SET speaker = speaker_label, updated_at = ?
      WHERE recording_id = ? AND speaker_label = ?
    `).run(new Date().toISOString(), recordingId, speakerLabel);
  }
}
