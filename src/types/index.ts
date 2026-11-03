export type Step =
  | 'dashboard'
  | 'upload'
  | 'live'
  | 'transcribe'
  | 'review'
  | 'export'
  | 'history';

export type SpeakerRole =
  | 'MAGISTRATE'
  | 'PROSECUTOR'
  | 'ADVOCATE'
  | 'ACCUSED'
  | 'COMPLAINANT'
  | 'WITNESS_PW1'
  | 'WITNESS_PW2'
  | 'COURT_ASSISTANT'
  | 'INVESTIGATING_OFFICER'
  | 'INTERPRETER'
  | 'UNKNOWN';

export interface Recording {
  id: number;
  filename: string;
  size_bytes: number;
  sha256: string;
  duration_sec: number;
  uploaded_by: string;
  created_at: string;
  stored_path: string;
  synthetic_attestation: boolean;
  status?: 'UPLOADED' | 'TRANSCRIBING' | 'TRANSCRIBED' | 'REVIEWING' | 'EXPORTED' | 'ARCHIVED';
  capture_source?: 'upload' | 'live';
  transcription_source?: 'real' | 'mock' | null;
  transcription_model?: string | null;
}

export interface AuditEvent {
  id: number;
  recording_id: number | null;
  actor: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface Segment {
  id: number;
  idx: number;
  speaker: string;
  speaker_label: string; // e.g. "Speaker A"
  start_sec: number;
  end_sec: number;
  text_original: string;
  text_current: string;
  confidence: number | null;
  language: string;
  is_approximate?: boolean;
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

export interface Flag {
  id: number;
  segment_id: number;
  segment_idx: number;
  flag_type: FlagType;
  severity: FlagSeverity;
  message: string;
  evidence: string;
  suggestion: string | null;
  status: FlagStatus;
  resolved_by: string | null;
  resolved_at: string | null;
  reason: string | null;
  related_segment_id: number | null;
  prompt_version: string;
  evidence_verified: number;
}

export interface Correction {
  id: number;
  segment_id: number;
  field: string;
  before_text: string;
  after_text: string;
  reviewer_name: string;
  reason: string;
  decision: string;
  created_at: string;
}

export interface SpeakerRoleMapping {
  speaker_label: string;
  role: SpeakerRole;
  assigned_by: string;
  assigned_at: string;
  reason: string | null;
}

export interface LiveTurn {
  turn_idx: number;
  speaker: string;
  start_s: number;
  end_s: number;
  text: string;
}

export interface LiveSessionState {
  status: 'idle' | 'connecting' | 'live' | 'ended' | 'error';
  elapsed_s: number;
  turns: LiveTurn[];
  partial: string;
  recording_id: number | null;
  turn_count: number;
  last_error: string | null;
  note: string | null;
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

export interface ExportHistory {
  id: number;
  recording_id: number;
  docx_filename: string;
  generated_by: string;
  created_at: string;
  summary_en: string;
  summary_sw: string;
}

export interface ApiCallLedgerEntry {
  id: number;
  timestamp: string;
  service: string;
  model: string;
  status: 'SUCCESS' | 'MOCK' | 'FAILED';
  duration_ms: number;
  note: string;
}
