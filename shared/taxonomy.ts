import { SpeakerRole } from './types';

export const TAXONOMY_ROLES: SpeakerRole[] = [
  'MAGISTRATE',
  'PROSECUTOR',
  'ADVOCATE',
  'ACCUSED',
  'COMPLAINANT',
  'WITNESS_PW1',
  'WITNESS_PW2',
  'COURT_ASSISTANT',
  'INVESTIGATING_OFFICER',
  'INTERPRETER',
  'UNKNOWN',
];

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
export const HEADER_BANNER = 'DRAFT — NOT A CERTIFIED RECORD';
export const FOOTER_DISCLAIMER =
  'Draft prepared with AI assistance for review by authorised court staff. Not a certified record.';
