import { db } from '../database';
import { CourtParticipant } from '../../../shared/types';

export class ParticipantRepo {
  static create(data: Omit<CourtParticipant, 'id'>): CourtParticipant {
    const stmt = db.prepare(`
      INSERT INTO participants (
        recording_id, full_name, role, witness_designation, description,
        verified, verified_by, verified_at, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      data.recording_id,
      data.full_name,
      data.role,
      data.witness_designation,
      data.description,
      data.verified,
      data.verified_by,
      data.verified_at,
      data.created_by,
      data.created_at
    );

    return { ...data, id: Number(info.lastInsertRowid) };
  }

  static getById(id: number): CourtParticipant | null {
    const row = db.prepare('SELECT * FROM participants WHERE id = ?').get(id) as CourtParticipant | undefined;
    return row || null;
  }

  static getByRecordingId(recordingId: number): CourtParticipant[] {
    return db.prepare(`
      SELECT * FROM participants WHERE recording_id = ? ORDER BY id ASC
    `).all(recordingId) as CourtParticipant[];
  }

  static verify(id: number, reviewer: string, verifiedAt: string): void {
    db.prepare(`
      UPDATE participants
      SET verified = 1, verified_by = ?, verified_at = ?
      WHERE id = ?
    `).run(reviewer, verifiedAt, id);
  }

  static delete(id: number): void {
    db.prepare('DELETE FROM participants WHERE id = ?').run(id);
  }
}
