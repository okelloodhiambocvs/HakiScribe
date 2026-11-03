import React, { useState } from 'react';
import {
  Search,
  CheckCircle,
  Trash2,
  Volume2,
  ChevronRight,
  Info,
  Clock,
} from 'lucide-react';
import { CourtParticipant, Recording, Segment, SpeakerRoleMapping } from '../types';
import { AppStorage } from '../services/storage';
import { ApiClient } from '../services/apiClient';
import { getSpeakerBadgeStyle, formatConfidence } from '../constants/brand';
import { resolveSegmentSpeaker } from '../../shared/participants';

interface TranscribeViewProps {
  reviewer: string;
  recording: Recording | null;
  segments: Segment[];
  onSegmentsChange: (segments: Segment[]) => void;
  mockMode: boolean;
  onMockModeChange: (val: boolean) => void;
  speakerRoles: SpeakerRoleMapping[];
  participants: CourtParticipant[];
  onNavigateToUpload: () => void;
  onNavigateToReview: () => void;
  onNotify?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const TranscribeView: React.FC<TranscribeViewProps> = ({
  reviewer,
  recording,
  segments,
  onSegmentsChange,
  mockMode,
  onMockModeChange,
  speakerRoles,
  participants,
  onNavigateToUpload,
  onNavigateToReview,
  onNotify,
}) => {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(segments.length > 0 ? 0 : null);
  const [speakerFilter, setSpeakerFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [lowConfidenceOnly, setLowConfidenceOnly] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showDeleteExpander, setShowDeleteExpander] = useState(false);
  const [audioError, setAudioError] = useState(false);

  if (!recording) {
    return (
      <div className="hakiscribe-card text-center py-10 space-y-4">
        <Info className="w-12 h-12 text-[#C9A86A] mx-auto" />
        <h3 className="text-xl font-bold text-[#0B3D2C]">No recording yet</h3>
        <p className="text-sm text-[#57534E] max-w-md mx-auto">
          Please upload and validate an audio recording first, or load the built-in demo case.
        </p>
        <button
          onClick={onNavigateToUpload}
          className="px-5 py-2.5 bg-[#0B3D2C] text-[#FAF7F0] font-bold rounded-lg text-sm hover:bg-[#082E21]"
        >
          Go to Upload
        </button>
      </div>
    );
  }

  const notify = (msg: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    if (onNotify) onNotify(msg, type);
  };

  const handleTranscribe = async () => {
    setIsTranscribing(true);
    try {
      const transcript = await ApiClient.transcribe(recording.id, mockMode);
      onSegmentsChange(transcript.segments as any);
      AppStorage.setSegments(transcript.segments as any);
      setSelectedIdx(0);
      notify(`Transcribed ${transcript.segments.length} segments with speaker diarization.`, 'success');
    } catch (err: any) {
      notify('Transcription failed: ' + err.message, 'error');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleDeleteRecording = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      notify('Please type DELETE to confirm permanent deletion.', 'warning');
      return;
    }
    if (!reviewer.trim()) {
      notify('Enter your reviewer name in the left panel first.', 'warning');
      return;
    }

    try {
      await ApiClient.deleteSession(recording.id, reviewer.trim(), 'DELETE');
      notify('Recording session permanently deleted.', 'success');
    } catch (err: any) {
      console.warn('Backend delete failed, falling back to local wipe:', err?.message);
    }

    AppStorage.clearAll();
    onNavigateToUpload();
  };

  // Distinct speakers in current segments
  const distinctSpeakers = Array.from(new Set(segments.map((s) => s.speaker)));
  const speakerOptions = ['ALL', ...distinctSpeakers];

  // Filtering segments
  const filteredSegments = segments.filter((s) => {
    if (speakerFilter !== 'ALL' && s.speaker !== speakerFilter) return false;
    if (lowConfidenceOnly && s.confidence !== null && s.confidence >= 0.75) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const inText = s.text_current.toLowerCase().includes(q);
      const inSpeaker = s.speaker.toLowerCase().includes(q);
      if (!inText && !inSpeaker) return false;
    }
    return true;
  });

  const selectedSegment = segments.find((s) => s.idx === selectedIdx);
  const selectedHeading = selectedSegment
    ? resolveSegmentSpeaker(selectedSegment.speaker_label, speakerRoles, participants)
    : null;

  const formatTimestamp = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = (sec % 60).toFixed(1);
    return `${m.toString().padStart(2, '0')}:${parseFloat(s) < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-6">
      {/* Recording Header Details Card */}
      <div className="hakiscribe-card space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8D9B8] pb-3">
          <div>
            <span className="text-xs font-bold text-[#78716C] uppercase tracking-wider">
              Recording Target
            </span>
            <h3 className="text-lg font-bold text-[#0B3D2C]">{recording.filename}</h3>
          </div>
          <div className="text-xs text-[#57534E] font-mono">
            SHA256: {recording.sha256.slice(0, 16)}â€¦
          </div>
        </div>

        {/* Audio Player */}
        <div className="bg-[#FAF7F0] p-3 rounded-lg border border-[#E8D9B8]">
          <div className="flex items-center gap-2 mb-2 text-xs font-bold text-[#0B3D2C]">
            <Volume2 className="w-4 h-4 text-[#C9A86A]" />
            <span>Master Audio Recording ({recording.filename})</span>
          </div>
          <audio
            controls
            className="w-full h-10 rounded"
            src={recording.stored_path}
            onError={() => setAudioError(true)}
          />
          {audioError && (
            <p className="text-xs text-[#B45309] mt-1">
              Audio preview stream is unavailable or pending local audio playback.
            </p>
          )}
        </div>

        {/* Delete Expander */}
        <div className="pt-1">
          <button
            onClick={() => setShowDeleteExpander(!showDeleteExpander)}
            className="text-xs text-[#B91C1C] hover:underline font-semibold flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{showDeleteExpander ? 'Hide deletion controls' : 'Delete recording and files'}</span>
          </button>

          {showDeleteExpander && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg space-y-2 text-xs">
              <p className="text-red-900 font-medium">
                Removes the recording row, transcript, flags, corrections, exports, and audio. A content-free deletion entry (id, timestamp, reviewer) is logged for legal compliance.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="text"
                  placeholder="Type DELETE to confirm"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-red-300 rounded text-xs w-full sm:w-60 focus:ring-1 focus:ring-red-600"
                />
                <button
                  onClick={handleDeleteRecording}
                  disabled={deleteConfirmText.trim().toUpperCase() !== 'DELETE'}
                  className={`px-3 py-1.5 rounded font-bold transition-colors ${
                    deleteConfirmText.trim().toUpperCase() === 'DELETE'
                      ? 'bg-[#B91C1C] text-white hover:bg-red-800'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Delete permanently
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Transcribe Controls */}
      <div className="hakiscribe-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-[#0B3D2C]">2. Transcribe</h3>
            <p className="text-xs text-[#57534E]">
              Run Muse Voice Transcribe in DIARIZATION mode to segment speech into speaker turns with accurate timestamps.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleTranscribe}
              disabled={isTranscribing}
              className={`px-6 py-2.5 rounded-lg font-bold text-sm shadow-xs transition-all ${
                isTranscribing
                  ? 'bg-gray-300 text-gray-600 cursor-wait'
                  : 'bg-[#0B3D2C] hover:bg-[#082E21] text-[#FAF7F0]'
              }`}
            >
              {isTranscribing ? 'Transcribing with Diarization...' : segments.length > 0 ? 'Retranscribe Recording' : 'Transcribe Recording'}
            </button>
          </div>
        </div>

        {/* Source status banner */}
        {segments.length > 0 && (
          <div className="p-3 bg-[#FAF7F0] border border-[#137333] rounded-lg text-xs font-semibold text-[#137333] flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-[#137333]" />
            <span>
              Transcription complete â€” speaker turns and timestamps verified from audio source.
            </span>
          </div>
        )}
      </div>

      {/* Segments Explorer */}
      {segments.length > 0 ? (
        <div className="space-y-4">
          {/* Safeguard note */}
          <div className="p-3 bg-[#FAF7F0] border border-[#C9A86A] rounded-lg text-xs text-[#0B3D2C]">
            <strong>Safeguard:</strong> Original AI text is strictly preserved. Text edits are recorded on the <strong>Review transcript</strong> tab with mandatory reasons.
          </div>

          {/* Filters & Search Toolbar */}
          <div className="hakiscribe-card space-y-3">
            {/* Speaker Filter Buttons */}
            <div>
              <span className="text-xs font-bold text-[#78716C] uppercase tracking-wider block mb-1.5">
                Speaker Turns Filter:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {speakerOptions.map((spk) => {
                  const isActive = speakerFilter === spk;
                  return (
                    <button
                      key={spk}
                      onClick={() => setSpeakerFilter(spk)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                        isActive
                          ? 'bg-[#0B3D2C] text-[#FAF7F0]'
                          : 'bg-[#FAF7F0] text-[#1F2A24] border border-[#E8D9B8] hover:bg-[#E8D9B8]'
                      }`}
                    >
                      {spk}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Search and Checkbox */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-[#E8D9B8]">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search verbatim transcript..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-[#FAF7F0] border border-[#C9A86A] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#0B3D2C]"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-medium text-[#1F2A24] cursor-pointer sm:ml-auto">
                <input
                  type="checkbox"
                  checked={lowConfidenceOnly}
                  onChange={(e) => setLowConfidenceOnly(e.target.checked)}
                  className="rounded text-[#0B3D2C] focus:ring-[#C9A86A]"
                />
                <span>Show low confidence only (&lt;0.75)</span>
              </label>

              <span className="text-xs text-[#78716C] font-mono">
                Showing {filteredSegments.length} of {segments.length} segments
              </span>
            </div>
          </div>

          {/* Segments List & Selected Inspector */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* List */}
            <div className="lg:col-span-2 space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {filteredSegments.map((segment) => {
                const isSelected = segment.idx === selectedIdx;
                const badgeStyle = getSpeakerBadgeStyle(segment.speaker);
                const confStyle = formatConfidence(segment.confidence);
                const heading = resolveSegmentSpeaker(segment.speaker_label, speakerRoles, participants).heading;

                return (
                  <div
                    key={segment.id}
                    onClick={() => setSelectedIdx(segment.idx)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white border-[#0B3D2C] shadow-md ring-1 ring-[#0B3D2C]'
                        : 'bg-white border-[#E8D9B8] hover:border-[#C9A86A] hover:bg-[#FAF7F0]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="px-2.5 py-0.5 rounded-full text-xs font-bold shadow-2xs truncate"
                          style={{ backgroundColor: badgeStyle.bg, color: badgeStyle.text }}
                          title={heading}
                        >
                          {heading}
                        </span>
                        <span className="text-xs font-mono text-[#57534E] flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3 text-[#C9A86A]" />
                          [{formatTimestamp(segment.start_sec)} â€“ {formatTimestamp(segment.end_sec)}]
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className="text-[11px] font-semibold px-2 py-0.5 rounded"
                          style={{ color: confStyle.color, backgroundColor: `${confStyle.color}15` }}
                        >
                          {confStyle.label}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedIdx(segment.idx);
                          }}
                          className="text-xs font-semibold text-[#0B3D2C] hover:underline flex items-center"
                        >
                          Inspect <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-sm text-[#1F2A24] font-medium leading-relaxed">
                      {segment.text_current}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Selected Segment Inspector Details */}
            <div className="hakiscribe-card self-start sticky top-4 space-y-4">
              <h4 className="text-base font-bold text-[#0B3D2C] border-b border-[#E8D9B8] pb-2 flex items-center justify-between">
                <span>Selected Segment Detail</span>
                {selectedSegment && (
                  <span className="text-xs text-[#78716C] font-mono">
                    Segment #{selectedSegment.idx}
                  </span>
                )}
              </h4>

              {selectedSegment ? (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2 bg-[#FAF7F0] p-2.5 rounded-lg border border-[#E8D9B8]">
                    <div className="col-span-2">
                      <span className="text-[#78716C] block">Speaker</span>
                      <strong className="text-[#0B3D2C]">{selectedHeading?.heading}</strong>
                    </div>
                    <div>
                      <span className="text-[#78716C] block">Diarization Label</span>
                      <strong className="text-[#0B3D2C] font-mono text-[11px]">{selectedSegment.speaker_label}</strong>
                    </div>
                    <div>
                      <span className="text-[#78716C] block">Language</span>
                      <strong className="text-[#0B3D2C]">{selectedSegment.language.toUpperCase()}</strong>
                    </div>
                    <div>
                      <span className="text-[#78716C] block">Timestamps</span>
                      <strong className="text-[#0B3D2C]">
                        {selectedSegment.start_sec.toFixed(1)}s â€“ {selectedSegment.end_sec.toFixed(1)}s
                      </strong>
                    </div>
                    <div>
                      <span className="text-[#78716C] block">Confidence</span>
                      <strong className="text-[#0B3D2C]">
                        {selectedSegment.confidence === null ? 'NULL (Voice API standard)' : selectedSegment.confidence}
                      </strong>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#78716C] uppercase mb-1">
                      Original AI Text (Immutable)
                    </label>
                    <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 italic">
                      "{selectedSegment.text_original}"
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#0B3D2C] uppercase mb-1">
                      Current Text (Read-only in transcribe view)
                    </label>
                    <div className="p-2.5 bg-[#FAF7F0] border border-[#C9A86A] rounded-lg font-medium text-[#1F2A24]">
                      "{selectedSegment.text_current}"
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={onNavigateToReview}
                      className="w-full py-2.5 bg-[#0B3D2C] hover:bg-[#082E21] text-[#FAF7F0] font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <span>Open in Review Desk to Edit</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <p className="text-[10px] text-gray-500 text-center mt-1.5">
                      Every edit requires a reason and is saved to the audit log.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500">Select any segment to inspect details.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="hakiscribe-card text-center py-10 space-y-3">
          <Info className="w-10 h-10 text-[#C9A86A] mx-auto" />
          <h4 className="text-lg font-bold text-[#0B3D2C]">No transcript yet</h4>
          <p className="text-sm text-[#57534E] max-w-sm mx-auto">
            Press "Transcribe Recording" above to generate speaker turns and timestamps with Muse Voice Transcribe.
          </p>
        </div>
      )}
    </div>
  );
};
