import { db } from '../database';
import { SpeakerRoleMapping } from '../../../shared/types';

export class RoleRepo {
  static upsert(mapping: SpeakerRoleMapping): void {
    db.prepare(`
      INSERT INTO speaker_roles (recording_id, speaker_label, role, assigned_by, assigned_at, reason)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(recording_id, speaker_label) DO UPDATE SET
        role = excluded.role,
        assigned_by = excluded.assigned_by,
        assigned_at = excluded.assigned_at,
        reason = excluded.reason
    `).run(
      mapping.recording_id,
      mapping.speaker_label,
      mapping.role,
      mapping.assigned_by,
      mapping.assigned_at,
      mapping.reason
    );
  }

  static getByRecordingId(recordingId: number): SpeakerRoleMapping[] {
    return db.prepare(`
      SELECT recording_id, speaker_label, role, assigned_by, assigned_at, reason
      FROM speaker_roles
      WHERE recording_id = ?
    `).all(recordingId) as SpeakerRoleMapping[];
  }
}
