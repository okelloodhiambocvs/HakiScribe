import { CourtParticipant, SpeakerRole } from '../../shared/types';
import { TAXONOMY_ROLES, WITNESS_DESIGNATIONS } from '../../shared/taxonomy';
import { ParticipantRepo } from '../db/repositories/participantRepo';
import { RoleRepo } from '../db/repositories/roleRepo';
import { AuditRepo } from '../db/repositories/auditRepo';
import { SessionRepo } from '../db/repositories/sessionRepo';

export class ParticipantService {
  static registerParticipant(
    recordingId: number,
    fullName: string,
    role: SpeakerRole,
    reviewer: string,
    witnessDesignation?: string | null,
    description?: string | null
  ): CourtParticipant {
    if (!reviewer || !reviewer.trim()) {
      throw new Error('Reviewer name is required to register a courtroom participant.');
    }
    if (!fullName || !fullName.trim()) {
      throw new Error('Participant full name is required.');
    }
    if (fullName.trim().length > 120) {
      throw new Error('Participant full name must not exceed 120 characters.');
    }
    if (!TAXONOMY_ROLES.includes(role)) {
      throw new Error(`Invalid participant role '${role}'. Must be one of locked taxonomy.`);
    }
    if (role === 'UNKNOWN') {
      throw new Error('Participants must be registered with a concrete courtroom role, not UNKNOWN.');
    }

    const designation = witnessDesignation && witnessDesignation.trim()
      ? witnessDesignation.trim().toUpperCase()
      : null;
    if (designation && !(WITNESS_DESIGNATIONS as readonly string[]).includes(designation)) {
      throw new Error(
        `Invalid witness designation '${designation}'. Use one of ${WITNESS_DESIGNATIONS.join(', ')}.`
      );
    }
    if (designation && role !== 'WITNESS' && role !== 'WITNESS_PW1' && role !== 'WITNESS_PW2') {
      throw new Error('Witness designations (PW/DW/CW) apply only to the Witness role.');
    }

    const session = SessionRepo.getById(recordingId);
    if (!session) {
      throw new Error(`Recording session #${recordingId} not found.`);
    }

    const now = new Date().toISOString();
    const participant = ParticipantRepo.create({
      recording_id: recordingId,
      full_name: fullName.trim(),
      role,
      witness_designation: designation,
      description: description && description.trim() ? description.trim().slice(0, 300) : null,
      verified: 0,
      verified_by: null,
      verified_at: null,
      created_by: reviewer.trim(),
      created_at: now,
    });

    AuditRepo.logEvent({
      recording_id: recordingId,
      actor: reviewer.trim(),
      action: 'PARTICIPANT_REGISTERED',
      details: `Registered ${participant.full_name} as ${role}${designation ? ` (${designation})` : ''}; identity pending verification`,
      timestamp: now,
    });

    return participant;
  }

  static listParticipants(recordingId: number): CourtParticipant[] {
    return ParticipantRepo.getByRecordingId(recordingId);
  }

  static verifyParticipant(recordingId: number, participantId: number, reviewer: string): CourtParticipant {
    if (!reviewer || !reviewer.trim()) {
      throw new Error('Reviewer name is required to verify a participant identity.');
    }

    const participant = ParticipantRepo.getById(participantId);
    if (!participant || participant.recording_id !== recordingId) {
      throw new Error(`Participant #${participantId} not found in recording #${recordingId}.`);
    }

    const now = new Date().toISOString();
    ParticipantRepo.verify(participantId, reviewer.trim(), now);

    AuditRepo.logEvent({
      recording_id: recordingId,
      actor: reviewer.trim(),
      action: 'PARTICIPANT_VERIFIED',
      details: `Verified identity of ${participant.full_name} (${participant.role})`,
      timestamp: now,
    });

    return ParticipantRepo.getById(participantId)!;
  }

  static deleteParticipant(recordingId: number, participantId: number, reviewer: string): void {
    if (!reviewer || !reviewer.trim()) {
      throw new Error('Reviewer name is required to remove a participant.');
    }

    const participant = ParticipantRepo.getById(participantId);
    if (!participant || participant.recording_id !== recordingId) {
      throw new Error(`Participant #${participantId} not found in recording #${recordingId}.`);
    }

    RoleRepo.clearParticipantMappings(participantId);
    ParticipantRepo.delete(participantId);

    AuditRepo.logEvent({
      recording_id: recordingId,
      actor: reviewer.trim(),
      action: 'PARTICIPANT_REMOVED',
      details: `Removed participant ${participant.full_name} (${participant.role}); linked speaker mappings reverted to unidentified`,
      timestamp: new Date().toISOString(),
    });
  }
}
