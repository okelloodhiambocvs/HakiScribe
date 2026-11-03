/**
 * Shared API Contracts and Types for HakiScribe-AI.
 * Synchronized between Server and Client to prevent schema drift.
 */

export type UserRole =
  | 'JUDICIAL_OFFICER'
  | 'COURT_CLERK'
  | 'REVIEWER'
  | 'SYSTEM_ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  court_station: string;
}

export type SpeakerRole =
  | 'JUDGE'
  | 'MAGISTRATE'
  | 'PROSECUTOR'
  | 'ADVOCATE'
  | 'ACCUSED'
  | 'COMPLAINANT'
  | 'WITNESS'
  | 'WITNESS_PW1'
  | 'WITNESS_PW2'
  | 'COURT_ASSISTANT'
  | 'INVESTIGATING_OFFICER'
  | 'INTERPRETER'
  | 'OTHER_PARTICIPANT'
  | 'UNKNOWN';

export interface RecordingSession {
  id: number;
  filename: string;
  size_bytes: number;
  sha256: string;
  duration_sec: number;
  uploaded_by: string;
  created_at: string;
  stored_path: string;
  synthetic_attestation: boolean;
  transcription_source: 'real' | 'mock' | null;
  transcription_model: string | null;
  capture_source: 'upload' | 'live';
  status: 'UPLOADED' | 'TRANSCRIBING' | 'TRANSCRIBED' | 'REVIEWING' | 'EXPORTED' | 'ARCHIVED';
}

export interface AudioUpload {
  filename: string;
  size_bytes: number;
  sha256: string;
  mimetype: string;
  synthetic_attestation: boolean;
  uploaded_by: string;
}

export interface TranscriptionJob {
  id: string;
  recording_id: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  model: string;
  source: 'real' | 'mock';
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export interface TranscriptSegment {
  id: number;
  recording_id: number;
  idx: number;
  speaker: string;
  speaker_label: string; // e.g. "Speaker A"
  start_sec: number;
  end_sec: number;
  text_original: string; // Immutable
  text_current: string;  // Editable
  confidence: number | null; // NULL for Meta Voice Transcribe API
  language: string;
  is_approximate?: boolean;
}

export interface Transcript {
  recording_id: number;
  segments: TranscriptSegment[];
  speakers: string[];
  total_segments: number;
  source: 'real' | 'mock';
}

export interface TranscriptCorrection {
  id: number;
  segment_id: number;
  recording_id: number;
  field: 'text_current' | 'speaker_role';
  before_text: string;
  after_text: string;
  reviewer_name: string;
  reason: string;
  decision: 'human_text_edit' | 'accept_suggestion' | 'role_assignment';
  created_at: string;
}

export type FlagType =
  | 'NAME_CANDIDATE'
  | 'LEGAL_TERM'
  | 'NUMBER_OR_DATE'
  | 'LANGUAGE_SWITCH'
  | 'SPEAKER_ATTRIBUTION'
  | 'REPETITION_OR_DISFLUENCY'
  | 'UNCLEAR_PASSAGE'
  | 'INCONSISTENCY';

export type FlagSeverity = 'LOW' | 'MEDIUM' | 'HIGH';
export type FlagStatus = 'OPEN' | 'RESOLVED' | 'DISMISSED' | 'RETAINED';

export interface ReviewFlag {
  id: number;
  segment_id: number;
  recording_id: number;
  segment_idx: number;
  flag_type: FlagType;
  severity: FlagSeverity;
  message: string;
  evidence: string; // Exact quote from transcript
  suggestion: string | null;
  status: FlagStatus;
  resolved_by: string | null;
  resolved_at: string | null;
  reason: string | null;
  related_segment_id: number | null;
  prompt_version: string;
  evidence_verified: number;
  created_at: string;
}

/**
 * A real courtroom participant registered by a human reviewer for one proceeding.
 * Identity is NEVER inferred by AI: rows are created and verified only by named reviewers.
 */
export interface CourtParticipant {
  id: number;
  recording_id: number;
  full_name: string;
  role: SpeakerRole;
  witness_designation: string | null; // e.g. PW1, PW2, DW1
  description: string | null;
  verified: number; // 0 = registered, 1 = identity verified by a reviewer
  verified_by: string | null;
  verified_at: string | null;
  created_by: string;
  created_at: string;
}

export interface SpeakerRoleMapping {
  recording_id: number;
  speaker_label: string;
  role: SpeakerRole;
  assigned_by: string;
  assigned_at: string;
  reason: string | null;
  participant_id: number | null;
  participant_name: string | null;
}

export interface AIReviewResult {
  recording_id: number;
  model: string;
  flags_created: number;
  flags_dropped: number;
  flags: ReviewFlag[];
  created_at: string;
}

export interface AuditEvent {
  id: number;
  recording_id: number | null;
  actor: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface ApiCallLedgerEntry {
  id: number;
  timestamp: string;
  service: string;
  model: string;
  endpoint: string;
  status: 'SUCCESS' | 'MOCK' | 'FAILED';
  duration_ms: number;
  note: string;
}

export interface MetricEnvelope {
  values: Record<string, number | null>;
  sample_size: number;
  how_computed: string;
  reason: string | null;
}

export interface EvaluationMetrics {
  ai_vs_reviewed: MetricEnvelope;
  reference: MetricEnvelope;
  speaker: MetricEnvelope;
  traceability: MetricEnvelope;
  review_time: MetricEnvelope;
}

export interface ExportDocument {
  id: number;
  recording_id: number;
  docx_filename: string;
  generated_by: string;
  created_at: string;
  summary_en: string;
  summary_sw: string;
  metrics: EvaluationMetrics;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    correlation_id?: string;
  };
}

export interface ApiError {
  code: string;
  message: string;
  status: number;
  details?: any;
}
