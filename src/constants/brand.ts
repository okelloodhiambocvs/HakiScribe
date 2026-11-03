import { SpeakerRole } from '../types';
import { TAXONOMY_ROLES as SHARED_ROLES, ROLE_DISPLAY_LABELS } from '../../shared/taxonomy';

export const BRAND = {
  primary_dark_green: '#0B3D2C',
  deep_green: '#082E21',
  accent_gold_brown: '#C9A86A',
  accent_light: '#E8D9B8',
  cream_bg: '#FAF7F0',
  card_bg: '#FFFFFF',
  text_dark: '#1F2A24',
  warning: '#B45309',
  danger: '#B91C1C',
  success: '#137333',
};

export const SPEAKER_COLORS: Record<string, string> = {
  JUDGE: '#0B3D2C',
  MAGISTRATE: '#0B3D2C',
  PROSECUTOR: '#1E4D2B',
  ADVOCATE: '#2F5D33',
  ACCUSED: '#7C2D12',
  COMPLAINANT: '#8A6D2F',
  WITNESS: '#5C6223',
  WITNESS_PW1: '#5C6223',
  WITNESS_PW2: '#57534E',
  COURT_ASSISTANT: '#3F6212',
  INVESTIGATING_OFFICER: '#44403C',
  INTERPRETER: '#C9A86A',
  OTHER_PARTICIPANT: '#57534E',
  UNKNOWN: '#78716C',
};

export const TAXONOMY_ROLES: SpeakerRole[] = [...SHARED_ROLES];

export { ROLE_DISPLAY_LABELS };

export const PRIVACY_NOTICE =
  'Audio is processed with AI models. This system uses synthetic demonstration data only with fictional court proceedings. ' +
  'Recordings and generated exports stay in your session until deleted. The tool never translates, paraphrases, ' +
  'adds words, or makes judicial decisions.';

export const FOOTER_TAGLINE = 'Clarity in Every Proceeding';
export const FOOTER_DISCLAIMER = 'AI proposes, human reviews. Drafts only â€” not certified court records.';
export const WATERMARK_TEXT = 'DRAFT - NOT CERTIFIED';
export const HEADER_BANNER = 'DRAFT â€” NOT A CERTIFIED RECORD';

export function getSpeakerBadgeStyle(speaker: string): { bg: string; text: string } {
  const bg = SPEAKER_COLORS[speaker] || '#4B5563';
  return { bg, text: '#FFFFFF' };
}

export function formatConfidence(confidence: number | null): { label: string; color: string } {
  if (confidence === null || confidence === undefined) {
    return { label: 'NULL', color: '#6B7280' };
  }
  if (confidence >= 0.9) {
    return { label: 'High', color: BRAND.success };
  }
  if (confidence >= 0.75) {
    return { label: 'Medium', color: BRAND.warning };
  }
  return { label: 'Low - Needs human review', color: BRAND.danger };
}
