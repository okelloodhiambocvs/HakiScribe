import { db } from '../database';
import { RecordingSession } from '../../../shared/types';

export class SessionRepo {
  static create(data: Omit<RecordingSession, 'id'>): RecordingSession {
    const stmt = db.prepare(`
      INSERT INTO recordings (
        filename, stored_path, sha256, size_bytes, duration_sec,
        uploaded_by, synthetic_attestation, transcription_source,
        transcription_model, capture_source, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      data.filename,
      data.stored_path,
      data.sha256,
      data.size_bytes,
      data.duration_sec,
      data.uploaded_by,
      data.synthetic_attestation ? 1 : 0,
      data.transcription_source,
      data.transcription_model,
      data.capture_source,
      data.status,
      data.created_at
    );

    return { ...data, id: Number(info.lastInsertRowid) };
  }

  static getById(id: number): RecordingSession | null {
    const row = db.prepare('SELECT * FROM recordings WHERE id = ?').get(id) as any;
    if (!row) return null;
    return {
      ...row,
      synthetic_attestation: Boolean(row.synthetic_attestation),
    };
  }

  static listAll(): RecordingSession[] {
    const rows = db.prepare('SELECT * FROM recordings ORDER BY id DESC').all() as any[];
    return rows.map((r) => ({
      ...r,
      synthetic_attestation: Boolean(r.synthetic_attestation),
    }));
  }

  static updateStatus(
    id: number,
    status: RecordingSession['status'],
    source?: 'real' | 'mock',
    model?: string
  ): void {
    if (source && model) {
      db.prepare(`
        UPDATE recordings
        SET status = ?, transcription_source = ?, transcription_model = ?
        WHERE id = ?
      `).run(status, source, model, id);
    } else {
      db.prepare('UPDATE recordings SET status = ? WHERE id = ?').run(status, id);
    }
  }

  static deleteSessionPermanently(id: number, reviewer: string): void {
    // Transaction ensures deletion and content-free logging happen atomically
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM recordings WHERE id = ?').run(id);
      db.prepare(`
        INSERT INTO deletion_log (recording_id, reviewer, deleted_at)
        VALUES (?, ?, ?)
      `).run(id, reviewer, new Date().toISOString());
    });
    tx();
  }
}
