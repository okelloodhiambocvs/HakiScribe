import { SpeakerRole } from './types';
import { ROLE_DISPLAY_LABELS } from './taxonomy';

export const UNIDENTIFIED_HEADING = 'UNIDENTIFIED PARTICIPANT â€” IDENTIFICATION REQUIRED';
export const IDENTIFICATION_REQUIRED_SUFFIX = 'IDENTIFICATION REQUIRED';
export const UNVERIFIED_SUFFIX = 'UNVERIFIED';

export interface ParticipantDisplayInput {
  id: number;
  full_name: string;
  role: string;
  witness_designation: string | null;
  verified: number;
}

export interface SpeakerMappingInput {
  speaker_label: string;
  role: string;
  participant_id: number | null;
}

export function getRoleLabel(role: string): string {
  return (ROLE_DISPLAY_LABELS as Record<string, string>)[role] || role;
}

export function formatParticipantHeading(participant: ParticipantDisplayInput): string {
  const name = participant.full_name.trim().toUpperCase();
  const roleLabel = getRoleLabel(participant.role).toUpperCase();
  const designation = participant.witness_designation
    ? ` (${participant.witness_designation.trim().toUpperCase()})`
    : '';
  return `${name} â€” ${roleLabel}${designation}`;
}

export interface ResolvedSpeaker<P> {
  heading: string;
  identified: boolean;
  participant: P | null;
}

export function resolveSegmentSpeaker<M extends SpeakerMappingInput, P extends ParticipantDisplayInput>(
  speakerLabel: string,
  mappings: M[],
  participants: P[]
): ResolvedSpeaker<P> {
  const mapping = mappings.find((m) => m.speaker_label === speakerLabel);
  const participant = mapping && mapping.participant_id !== null
    ? participants.find((p) => p.id === mapping.participant_id) || null
    : null;

  if (participant && participant.verified === 1) {
    return { heading: formatParticipantHeading(participant), identified: true, participant };
  }

  if (participant) {
    return {
      heading: `${formatParticipantHeading(participant)} (${UNVERIFIED_SUFFIX})`,
      identified: false,
      participant,
    };
  }

  if (mapping && mapping.role && mapping.role !== 'UNKNOWN') {
    return {
      heading: `${getRoleLabel(mapping.role).toUpperCase()} â€” ${IDENTIFICATION_REQUIRED_SUFFIX}`,
      identified: false,
      participant: null,
    };
  }

  return { heading: UNIDENTIFIED_HEADING, identified: false, participant: null };
}

export function isParticipantRoleForAssignment(role: SpeakerRole): boolean {
  return role !== 'UNKNOWN';
}
