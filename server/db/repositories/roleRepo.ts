import { db } from '../database';
import { SpeakerRoleMapping } from '../../../shared/types';

export class RoleRepo {
  static upsert(mapping: SpeakerRoleMapping): void {
    db.prepare(`
      INSERT INTO speaker_roles (recording_id, speaker_label, role, assigned_by, assigned_at, reason, participant_id, participant_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(recording_id, speaker_label) DO UPDATE SET
        role = excluded.role,
        assigned_by = excluded.assigned_by,
        assigned_at = excluded.assigned_at,
        reason = excluded.reason,
        participant_id = excluded.participant_id,
        participant_name = excluded.participant_name
    `).run(
      mapping.recording_id,
      mapping.speaker_label,
      mapping.role,
      mapping.assigned_by,
      mapping.assigned_at,
      mapping.reason,
      mapping.participant_id,
      mapping.participant_name
    );
  }

  static getByRecordingId(recordingId: number): SpeakerRoleMapping[] {
    return db.prepare(`
      SELECT recording_id, speaker_label, role, assigned_by, assigned_at, reason, participant_id, participant_name
      FROM speaker_roles
      WHERE recording_id = ?
    `).all(recordingId) as SpeakerRoleMapping[];
  }

  static deleteMapping(recordingId: number, speakerLabel: string): void {
    db.prepare(`
      DELETE FROM speaker_roles WHERE recording_id = ? AND speaker_label = ?
    `).run(recordingId, speakerLabel);
  }

  static clearParticipantMappings(participantId: number): void {
    db.prepare(`
      UPDATE speaker_roles
      SET participant_id = NULL, participant_name = NULL
      WHERE participant_id = ?
    `).run(participantId);
  }
}
