import React, { useState, useEffect, useRef } from 'react';
import {
  FileAudio,
  RotateCcw,
  AlertCircle,
  Lock,
  Edit3,
  Save,
} from 'lucide-react';
import { CourtParticipant, Recording, Segment, SpeakerRoleMapping } from '../../types';
import { resolveSegmentSpeaker } from '../../../shared/participants';

interface SegmentWorkspaceProps {
  segment: Segment;
  recording: Recording;
  hasReviewer: boolean;
  speakerRoles: SpeakerRoleMapping[];
  participants: CourtParticipant[];
  onSaveEdit: (newText: string, reason: string) => void;
  onNotify?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const PRESET_REASONS = [
  'Court honorific / title correction',
  'Statute section / case citation verify',
  'Code-switching Swahili phrase verbatim',
  'Factual number, date, or bail term verify',
  'Speaker attribution correction',
];

export const SegmentWorkspace: React.FC<SegmentWorkspaceProps> = ({
  segment,
  recording,
  hasReviewer,
  speakerRoles,
  participants,
  onSaveEdit,
  onNotify,
}) => {
  const [editText, setEditText] = useState(segment.text_current);
  const [editReason, setEditReason] = useState('');
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setEditText(segment.text_current);
    setEditReason('');
    setValidationError(null);
  }, [segment.id, segment.text_current]);

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const handleJumpToPassage = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = segment.start_sec;
      audioRef.current.play().catch(() => {});
    }
  };

  const handleSave = () => {
    if (!hasReviewer) {
      const msg = 'Enter your reviewer name in the left panel before saving edits.';
      setValidationError(msg);
      if (onNotify) onNotify(msg, 'warning');
      return;
    }
    if (!editReason.trim()) {
      const msg = 'A mandatory reason is required for every judicial transcript edit.';
      setValidationError(msg);
      if (onNotify) onNotify(msg, 'warning');
      return;
    }
    if (editText === segment.text_current) {
      const msg = 'No textual changes detected in the segment.';
      setValidationError(msg);
      if (onNotify) onNotify(msg, 'info');
      return;
    }

    setValidationError(null);
    onSaveEdit(editText, editReason.trim());
    setEditReason('');
  };

  const isModifiedFromOriginal = editText !== segment.text_original;
  const isDirty = editText !== segment.text_current;
  const resolved = resolveSegmentSpeaker(segment.speaker_label, speakerRoles, participants);

  return (
    <div className="space-y-4">
      {/* Passage Audio Player with Speed Control */}
      <div className="hakiscribe-card space-y-3">
        <div className="flex items-center justify-between border-b border-[#E8D9B8] pb-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-[#0B3D2C] text-[#FAF7F0] font-bold text-xs">
              Segment #{segment.idx}
            </span>
            <span className="text-xs font-bold text-[#0B3D2C] flex items-center gap-1.5">
              <FileAudio className="w-3.5 h-3.5 text-[#C9A86A]" />
              Audio Passage Review
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleJumpToPassage}
              className="flex items-center gap-1 px-2.5 py-1 bg-[#FAF7F0] hover:bg-[#E8D9B8] text-[#0B3D2C] border border-[#C9A86A] rounded-md text-[11px] font-bold transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Jump to {segment.start_sec.toFixed(1)}s</span>
            </button>
            <span className="text-[11px] font-mono text-[#78716C]">
              {segment.start_sec.toFixed(1)}s â€“ {segment.end_sec.toFixed(1)}s
            </span>
          </div>
        </div>

        <div
          className={`px-3 py-2 rounded-lg border text-xs font-bold ${
            resolved.identified
              ? 'bg-emerald-50/60 border-emerald-300 text-emerald-900'
              : 'bg-red-50/60 border-red-300 text-[#B91C1C]'
          }`}
        >
          {resolved.heading}
        </div>

        <div className="bg-[#FAF7F0] p-3 rounded-lg border border-[#E8D9B8] flex flex-col sm:flex-row items-center gap-3">
          <audio
            ref={audioRef}
            controls
            className="w-full sm:flex-1 h-9 rounded"
            src={recording.stored_path}
          />

          {/* Speed Controls */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-md border border-[#E8D9B8] text-[10px] font-bold text-[#78716C]">
            <span className="px-1 text-[#0B3D2C]">Speed:</span>
            {[0.75, 1.0, 1.25, 1.5].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => handleRateChange(rate)}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  playbackRate === rate
                    ? 'bg-[#0B3D2C] text-white'
                    : 'hover:bg-[#FAF7F0] text-[#1F2A24]'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Side-by-Side Dual Pane Text Workspace */}
      <div className="hakiscribe-card space-y-4">
        <div className="flex items-center justify-between border-b border-[#E8D9B8] pb-2">
          <h3 className="text-xs font-bold text-[#0B3D2C] uppercase tracking-wider flex items-center gap-1.5">
            <Edit3 className="w-3.5 h-3.5 text-[#C9A86A]" />
            <span>Dual-Pane Transcript Verification Desk</span>
          </h3>
          {isModifiedFromOriginal && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#C9A86A]/20 text-[#0B3D2C]">
              Human Corrected
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Original Text (Immutable) */}
          <div className="space-y-1.5">
            <label className="flex items-center justify-between font-bold text-[#78716C] uppercase text-[10px]">
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3 text-[#78716C]" />
                Original ASR Output (Immutable)
              </span>
              <span className="text-[10px] font-mono text-[#78716C]">Read-only</span>
            </label>
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg text-stone-700 italic min-h-[96px] text-xs leading-relaxed select-text font-serif">
              "{segment.text_original}"
            </div>
            <p className="text-[10px] text-[#78716C]">
              Locked into the immutable audit ledger. Preserved for appeals and verification.
            </p>
          </div>

          {/* Current Human Editable Text */}
          <div className="space-y-1.5">
            <label className="flex items-center justify-between font-bold text-[#0B3D2C] uppercase text-[10px]">
              <span className="flex items-center gap-1">
                <Edit3 className="w-3 h-3 text-[#C9A86A]" />
                Current Verified Record (Editable)
              </span>
              {isDirty && (
                <span className="text-[10px] text-[#B45309] font-bold">Unsaved changes</span>
              )}
            </label>
            <textarea
              value={editText}
              onChange={(e) => {
                setEditText(e.target.value);
                setValidationError(null);
              }}
              disabled={!hasReviewer}
              rows={4}
              className="w-full p-3 bg-[#FAF7F0] border border-[#C9A86A] rounded-lg text-[#1F2A24] font-medium text-xs leading-relaxed focus:ring-2 focus:ring-[#0B3D2C] focus:outline-none resize-none font-sans"
              placeholder="Edit transcript text..."
              aria-label="Verified transcript text"
            />
            <p className="text-[10px] text-[#78716C]">
              Modifications are saved with full before/after diffs and mandatory reviewer attribution.
            </p>
          </div>
        </div>

        {/* Unified Diff Display */}
        {isModifiedFromOriginal && (
          <div className="p-3 bg-[#FAF7F0] border border-[#E8D9B8] rounded-lg text-xs font-mono space-y-1">
            <span className="text-[#78716C] block font-bold text-[10px] uppercase tracking-wider">
              Audit Diff: Original vs Current Record
            </span>
            <div className="text-[#B91C1C] bg-red-50/80 p-1.5 rounded leading-normal border border-red-100">
              - {segment.text_original}
            </div>
            <div className="text-[#137333] bg-emerald-50/80 p-1.5 rounded leading-normal border border-emerald-100">
              + {editText}
            </div>
          </div>
        )}

        {/* Validation Error Banner */}
        {validationError && (
          <div className="p-2.5 bg-amber-50 border border-[#B45309] rounded-lg text-xs font-medium text-[#B45309] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Mandatory Edit Reason Section */}
        <div className="pt-2 border-t border-[#E8D9B8] space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-[#0B3D2C]">
              Mandatory Edit Reason <span className="text-[#B91C1C]">*</span>
            </label>
            <span className="text-[10px] text-[#78716C]">Required for judicial compliance</span>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap gap-1.5">
            {PRESET_REASONS.map((preset) => (
              <button
                key={preset}
                type="button"
                disabled={!hasReviewer}
                onClick={() => {
                  setEditReason(preset);
                  setValidationError(null);
                }}
                className={`text-[10px] px-2.5 py-1 rounded-md border transition-colors ${
                  editReason === preset
                    ? 'bg-[#0B3D2C] text-[#FAF7F0] border-[#0B3D2C]'
                    : 'bg-white hover:bg-[#FAF7F0] text-[#1F2A24] border-[#E8D9B8]'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Or type custom reason (e.g. Verified plea from courtroom audio at 12.4s)..."
              value={editReason}
              onChange={(e) => {
                setEditReason(e.target.value);
                setValidationError(null);
              }}
              disabled={!hasReviewer}
              className="grow px-3 py-2 text-xs bg-[#FAF7F0] border border-[#C9A86A] rounded-lg text-[#1F2A24] focus:outline-none focus:ring-1 focus:ring-[#0B3D2C]"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasReviewer || !editReason.trim() || !isDirty}
              className={`flex items-center justify-center gap-1.5 px-5 py-2 rounded-lg font-bold text-xs transition-all shadow-xs ${
                hasReviewer && editReason.trim() && isDirty
                  ? 'bg-[#0B3D2C] hover:bg-[#082E21] text-[#FAF7F0]'
                  : 'bg-stone-200 text-stone-400 cursor-not-allowed'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Correction</span>
            </button>
          </div>

          {!hasReviewer && (
            <p className="text-[11px] text-[#B45309] font-medium">
              Enter your reviewer name in the left panel to unlock transcript editing.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
