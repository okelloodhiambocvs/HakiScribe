import React, { useState } from 'react';
import { Sparkles, AlertCircle, CheckCircle } from 'lucide-react';
import { Correction, Flag, Recording, Segment, SpeakerRole, SpeakerRoleMapping } from '../types';
import { SegmentList } from '../components/review/SegmentList';
import { SegmentWorkspace } from '../components/review/SegmentWorkspace';
import { FlagList } from '../components/review/FlagList';
import { SpeakerRoleAssigner } from '../components/review/SpeakerRoleAssigner';
import { CorrectionHistory } from '../components/review/CorrectionHistory';
import { ApiClient } from '../services/apiClient';
import { AppStorage } from '../services/storage';

interface ReviewViewProps {
  reviewer: string;
  recording: Recording | null;
  segments: Segment[];
  onSegmentsChange: (segments: Segment[]) => void;
  flags: Flag[];
  onFlagsChange: (flags: Flag[]) => void;
  corrections: Correction[];
  onCorrectionsChange: (corrections: Correction[]) => void;
  speakerRoles: SpeakerRoleMapping[];
  onSpeakerRolesChange: (roles: SpeakerRoleMapping[]) => void;
  onNavigateToUpload: () => void;
  onNavigateToTranscribe: () => void;
}

export const ReviewView: React.FC<ReviewViewProps> = ({
  reviewer,
  recording,
  segments,
  onSegmentsChange,
  flags,
  onFlagsChange,
  corrections,
  onCorrectionsChange,
  speakerRoles,
  onSpeakerRolesChange,
  onNavigateToUpload,
  onNavigateToTranscribe,
}) => {
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [isRunningAiReview, setIsRunningAiReview] = useState(false);
  const [aiReviewSummary, setAiReviewSummary] = useState<{
    created: number;
    dropped: number;
    verified: number;
  } | null>(null);

  const hasReviewer = Boolean(reviewer.trim());
  const selectedSegment = segments.find((s) => s.idx === selectedIdx) || segments[0];

  if (!recording) {
    return (
      <div className="hakiscribe-card text-center py-10 space-y-3">
        <AlertCircle className="w-12 h-12 text-[#C9A86A] mx-auto" />
        <h3 className="text-xl font-bold text-[#0B3D2C]">No recording yet</h3>
        <p className="text-sm text-[#57534E]">Upload and validate a synthetic hearing recording first.</p>
        <button
          onClick={onNavigateToUpload}
          className="px-5 py-2.5 bg-[#0B3D2C] text-[#FAF7F0] font-bold rounded-lg text-sm hover:bg-[#082E21]"
        >
          Go to Upload
        </button>
      </div>
    );
  }

  if (segments.length === 0) {
    return (
      <div className="hakiscribe-card text-center py-10 space-y-3">
        <AlertCircle className="w-12 h-12 text-[#C9A86A] mx-auto" />
        <h3 className="text-xl font-bold text-[#0B3D2C]">No transcript yet</h3>
        <p className="text-sm text-[#57534E]">Transcribe the recording before running human review.</p>
        <button
          onClick={onNavigateToTranscribe}
          className="px-5 py-2.5 bg-[#0B3D2C] text-[#FAF7F0] font-bold rounded-lg text-sm hover:bg-[#082E21]"
        >
          Go to Transcribe
        </button>
      </div>
    );
  }

  const unresolvedFlags = flags.filter((f) => f.status === 'OPEN' || f.status === 'RETAINED');
  const openCount = flags.filter((f) => f.status === 'OPEN').length;

  const unresolvedBySegment: Record<number, Flag[]> = {};
  unresolvedFlags.forEach((f) => {
    if (!unresolvedBySegment[f.segment_idx]) unresolvedBySegment[f.segment_idx] = [];
    unresolvedBySegment[f.segment_idx].push(f);
  });
  const unresolvedSegmentIndices = Object.keys(unresolvedBySegment).map(Number).sort((a, b) => a - b);

  const handleRunAiReview = async () => {
    setIsRunningAiReview(true);
    try {
      const result = await ApiClient.runReview(recording.id);
      onFlagsChange(result.flags as any);
      AppStorage.setFlags(result.flags as any);
      setAiReviewSummary({
        created: result.flags_created,
        dropped: result.flags_dropped,
        verified: result.flags_created,
      });
    } catch (err: any) {
      alert('Review failed: ' + err.message);
    } finally {
      setIsRunningAiReview(false);
    }
  };

  const handleSaveTextEdit = async (newText: string, reason: string) => {
    try {
      const result = await ApiClient.editSegment(selectedSegment.id, newText, reviewer.trim(), reason);
      const updatedSegments = segments.map((s) => (s.id === selectedSegment.id ? result.segment : s));
      onSegmentsChange(updatedSegments);
      AppStorage.setSegments(updatedSegments);

      const updatedCorrections = [result.correction, ...corrections];
      onCorrectionsChange(updatedCorrections);
      AppStorage.setCorrections(updatedCorrections);
    } catch (err: any) {
      alert('Failed to save edit: ' + err.message);
    }
  };

  const handleDecideFlag = async (
    flag: Flag,
    decision: 'ACCEPT' | 'DISMISS' | 'RETAIN',
    reason: string,
    suggestionText?: string
  ) => {
    try {
      const result = await ApiClient.decideFlag(flag.id, decision, reviewer.trim(), reason, suggestionText);
      const updatedFlags = flags.map((f) => (f.id === flag.id ? result.flag : f));
      onFlagsChange(updatedFlags as any);
      AppStorage.setFlags(updatedFlags as any);

      if (result.segment) {
        const updatedSegments = segments.map((s) => (s.id === result.segment!.id ? result.segment! : s));
        onSegmentsChange(updatedSegments);
        AppStorage.setSegments(updatedSegments);
      }
      if (result.correction) {
        const updatedCorrections = [result.correction, ...corrections];
        onCorrectionsChange(updatedCorrections);
        AppStorage.setCorrections(updatedCorrections);
      }
    } catch (err: any) {
      alert('Failed to record flag decision: ' + err.message);
    }
  };

  const handleAssignSpeakerRole = async (speakerLabel: string, role: SpeakerRole, reason?: string) => {
    try {
      const mapping = await ApiClient.assignSpeakerRole(recording.id, speakerLabel, role, reviewer.trim(), reason);
      const updatedSegments = segments.map((s) => (s.speaker_label === speakerLabel ? { ...s, speaker: role } : s));
      onSegmentsChange(updatedSegments);
      AppStorage.setSegments(updatedSegments);

      const existingIdx = speakerRoles.findIndex((r) => r.speaker_label === speakerLabel);
      const updatedRoles = existingIdx >= 0 ? [...speakerRoles] : [...speakerRoles, mapping as any];
      if (existingIdx >= 0) updatedRoles[existingIdx] = mapping as any;

      onSpeakerRolesChange(updatedRoles);
      AppStorage.setSpeakerRoles(updatedRoles);
    } catch (err: any) {
      alert('Failed to assign speaker role: ' + err.message);
    }
  };

  const segmentFlags = flags.filter((f) => f.segment_id === selectedSegment.id);
  const segmentHistory = corrections.filter((c) => c.segment_id === selectedSegment.id);
  const currentRoleMapping = speakerRoles.find((r) => r.speaker_label === selectedSegment.speaker_label);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#0B3D2C]">3. Review Transcript</h2>
          <p className="text-sm text-[#57534E]">
            Two-pane human review desk with passage audio, AI suggestion flags, speaker attribution, and traceable audit history.
          </p>
        </div>

        <button
          onClick={handleRunAiReview}
          disabled={isRunningAiReview}
          className={`px-5 py-2.5 rounded-lg font-bold text-sm shadow-xs transition-all flex items-center gap-2 ${
            isRunningAiReview
              ? 'bg-gray-300 text-gray-600 cursor-wait'
              : 'bg-[#C9A86A] hover:bg-[#B39356] text-[#0B3D2C]'
          }`}
        >
          <Sparkles className="w-4 h-4 text-[#0B3D2C]" />
          <span>{isRunningAiReview ? 'Running Spark Review...' : 'Run AI review (Spark)'}</span>
        </button>
      </div>

      {aiReviewSummary && (
        <div className="p-3.5 bg-[#FAF7F0] border border-[#137333] rounded-xl text-xs font-semibold text-[#137333] flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-[#137333]" />
            <span>
              {aiReviewSummary.created} review flags verified with exact quotes · {aiReviewSummary.dropped} unquoted candidate dropped
            </span>
          </div>
          <span className="text-[11px] text-[#0B3D2C] bg-[#137333]/15 px-2 py-0.5 rounded font-bold">
            Guarded Evidence Pass
          </span>
        </div>
      )}

      {unresolvedFlags.length > 0 && (
        <div className="hakiscribe-card space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#0B3D2C]">
            <span className="flex items-center gap-1.5 text-[#B45309]">
              <AlertCircle className="w-4 h-4 text-[#B45309]" />
              Unresolved issues ({openCount} open · {unresolvedFlags.length - openCount} retained as uncertain)
            </span>
            <span className="text-gray-500 font-normal">Click to jump directly:</span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {unresolvedSegmentIndices.map((idx) => {
              const count = unresolvedBySegment[idx].length;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedIdx(idx)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    idx === selectedIdx
                      ? 'bg-[#0B3D2C] text-[#FAF7F0] ring-2 ring-[#C9A86A]'
                      : 'bg-[#FAF7F0] text-[#0B3D2C] border border-[#C9A86A] hover:bg-[#E8D9B8]'
                  }`}
                >
                  Segment {idx} · {count} flag{count > 1 ? 's' : ''}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5">
          <SegmentList
            segments={segments}
            selectedIdx={selectedIdx}
            onSelectSegment={(idx) => setSelectedIdx(idx)}
            flags={flags}
          />
        </div>

        <div className="lg:col-span-7 space-y-5">
          <SegmentWorkspace
            segment={selectedSegment}
            recording={recording}
            hasReviewer={hasReviewer}
            onSaveEdit={handleSaveTextEdit}
          />

          <FlagList
            flags={segmentFlags}
            hasReviewer={hasReviewer}
            onDecideFlag={handleDecideFlag}
          />

          <SpeakerRoleAssigner
            segment={selectedSegment}
            currentRoleMapping={currentRoleMapping as any}
            hasReviewer={hasReviewer}
            onAssignRole={handleAssignSpeakerRole}
          />

          <CorrectionHistory corrections={segmentHistory} />
        </div>
      </div>
    </div>
  );
};
