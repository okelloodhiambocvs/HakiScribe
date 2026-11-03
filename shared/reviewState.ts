export type ReviewStatus = 'NEEDS_REVIEW' | 'CLEARED';

export interface ReviewStateInput {
  segmentId: number;
  segmentIdx: number;
  textCurrent: string;
  confidence: number | null;
  flags: Array<{
    id: number;
    segment_id: number;
    flag_type: string;
    severity: string;
    message: string;
    status: string;
    resolved_by: string | null;
  }>;
  corrections: Array<{ reviewer_name: string }>;
  speakerIdentified: boolean;
  speakerIdentityReason: string | null;
}

export interface ReviewState {
  status: ReviewStatus;
  verifiedByHuman: boolean;
  reasons: string[];
  statusLabel: string;
}

export const NEEDS_REVIEW_LABEL = 'NEEDS REVIEW';
export const CLEARED_HUMAN_LABEL = 'CLEARED â€” HUMAN VERIFIED';
export const CLEARED_AUTO_LABEL = 'CLEARED â€” NO ISSUES DETECTED';

export const LOW_CONFIDENCE_THRESHOLD = 0.75;

const UNCLEAR_MARKER_PATTERN = /\[(inaudible|unclear|unintelligible|crosstalk|overlap)\]/i;

function isUnresolvedStatus(status: string): boolean {
  return status === 'OPEN' || status === 'RETAINED';
}

function isDecidedStatus(status: string): boolean {
  return status === 'RESOLVED' || status === 'DISMISSED';
}

export function computeReviewState(input: ReviewStateInput): ReviewState {
  const reasons: string[] = [];
  const segmentFlags = input.flags.filter((f) => f.segment_id === input.segmentId);

  if (!input.speakerIdentified) {
    reasons.push(input.speakerIdentityReason || 'Speaker identity not verified.');
  }

  for (const flag of segmentFlags) {
    if (isUnresolvedStatus(flag.status)) {
      reasons.push(`Open ${flag.flag_type.replace(/_/g, ' ').toLowerCase()} flag: ${flag.message}`);
    }
  }

  if (input.confidence !== null && input.confidence < LOW_CONFIDENCE_THRESHOLD) {
    reasons.push(
      `Low transcription confidence (${input.confidence.toFixed(2)}) â€” human confirmation required.`
    );
  }

  if (UNCLEAR_MARKER_PATTERN.test(input.textCurrent)) {
    reasons.push('Speech unclear or inaudible in passage.');
  }

  const humanCorrection = input.corrections.some((c) => c.reviewer_name.trim().length > 0);
  const humanDecision = segmentFlags.some(
    (f) => isDecidedStatus(f.status) && f.resolved_by !== null && f.resolved_by.trim().length > 0
  );
  const verifiedByHuman = humanCorrection || humanDecision;

  if (reasons.length > 0) {
    return { status: 'NEEDS_REVIEW', verifiedByHuman, reasons, statusLabel: NEEDS_REVIEW_LABEL };
  }

  return {
    status: 'CLEARED',
    verifiedByHuman,
    reasons: [],
    statusLabel: verifiedByHuman ? CLEARED_HUMAN_LABEL : CLEARED_AUTO_LABEL,
  };
}
