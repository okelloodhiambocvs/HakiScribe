import { SpeakerRole } from './types';

export const TAXONOMY_ROLES: SpeakerRole[] = [
  'JUDGE',
  'MAGISTRATE',
  'PROSECUTOR',
  'ADVOCATE',
  'ACCUSED',
  'COMPLAINANT',
  'WITNESS',
  'WITNESS_PW1',
  'WITNESS_PW2',
  'COURT_ASSISTANT',
  'INVESTIGATING_OFFICER',
  'INTERPRETER',
  'OTHER_PARTICIPANT',
  'UNKNOWN',
];

export const ROLE_DISPLAY_LABELS: Record<SpeakerRole, string> = {
  JUDGE: 'Judge',
  MAGISTRATE: 'Magistrate',
  PROSECUTOR: 'Prosecutor',
  ADVOCATE: 'Defence Advocate',
  ACCUSED: 'Accused Person',
  COMPLAINANT: 'Complainant',
  WITNESS: 'Witness',
  WITNESS_PW1: 'Witness (PW1)',
  WITNESS_PW2: 'Witness (PW2)',
  COURT_ASSISTANT: 'Court Assistant',
  INVESTIGATING_OFFICER: 'Investigating Officer',
  INTERPRETER: 'Interpreter',
  OTHER_PARTICIPANT: 'Other Participant',
  UNKNOWN: 'Unidentified Participant',
};

export const WITNESS_DESIGNATIONS = ['PW1', 'PW2', 'PW3', 'PW4', 'PW5', 'DW1', 'DW2', 'DW3', 'CW1'] as const;
export type WitnessDesignation = (typeof WITNESS_DESIGNATIONS)[number];

export const ALLOWED_AUDIO_EXTENSIONS = [
  '.mp3',
  '.wav',
  '.m4a',
  '.aac',
  '.adts',
  '.ogg',
  '.opus',
  '.webm',
];

export const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // 25 MB limit

export const WATERMARK_TEXT = 'DRAFT - NOT CERTIFIED';
export const HEADER_BANNER = 'DRAFT â€” NOT A CERTIFIED RECORD';
export const FOOTER_DISCLAIMER =
  'Draft prepared with AI assistance for review by authorised court staff. Not a certified record.';
