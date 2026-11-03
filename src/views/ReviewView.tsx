import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { Correction, CourtParticipant, Flag, Recording, Segment, SpeakerRole, SpeakerRoleMapping } from '../types';
import { SegmentList } from '../components/review/SegmentList';
import { SegmentWorkspace } from '../components/review/SegmentWorkspace';
import { FlagList } from '../components/review/FlagList';
import { ParticipantRegistry } from '../components/review/ParticipantRegistry';
import { SpeakerParticipantAssigner } from '../components/review/SpeakerParticipantAssigner';
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
  participants: CourtParticipant[];
  onParticipantsChange: (participants: CourtParticipant[]) => void;
  onNavigateToUpload: () => void;
  onNavigateToTranscribe: () => void;
  onNavigateToExport?: () => void;
  onNotify?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
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
  participants,
  onParticipantsChange,
  onNavigateToUpload,
  onNavigateToTranscribe,
  onNavigateToExport,
  onNotify,
}) => {
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [isRunningAiReview, setIsRunningAiReview] = useState(false);
  const [aiReviewSummary, setAiReviewSummary] = useState<{
    created: number;
    dropped: number;
  } | null>(null);
  const autoReviewRef = useRef<number | null>(null);

  const notify = (msg: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    if (onNotify) onNotify(msg, type);
  };

  const hasReviewer = Boolean(reviewer.trim());
  const selectedSegment = segments.find((s) => s.idx === selectedIdx) || segments[0];

  // Muse Spark review runs automatically once per recording when the desk opens
  // with a transcript but no flags yet, so reviewers never operate a raw AI control.
  useEffect(() => {
    if (!recording || segments.length === 0) return;
    if (autoReviewRef.current === recording.id) return;
    autoReviewRef.current = recording.id;
    if (flags.length > 0) return;

    setIsRunningAiReview(true);
    ApiClient.runReview(recording.id)
      .then((result) => {
        onFlagsChange(result.flags as any);
        AppStorage.setFlags(result.flags as any);
        setAiReviewSummary({ created: result.flags_created, dropped: result.flags_dropped });
      })
      .catch((err: any) => {
        notify('AI review unavailable: ' + err.message, 'warning');
      })
      .finally(() => {
        setIsRunningAiReview(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording?.id, segments.length]);

  if (!recording) {
    return (
      <div className="hakiscribe-card text-center py-12 space-y-3">
        <AlertCircle className="w-12 h-12 text-[#C9A86A] mx-auto" />
        <h3 className="text-xl font-bold text-[#0B3D2C]">No recording session loaded</h3>
        <p className="text-xs text-[#57534E]">Upload or record court hearing audio before review.</p>
        <button
          type="button"
          onClick={onNavigateToUpload}
          className="px-5 py-2.5 bg-[#0B3D2C] text-[#FAF7F0] font-bold rounded-lg text-xs hover:bg-[#082E21]"
        >
          Go to Audio Ingestion
        </button>
      </div>
    );
  }

  if (segments.length === 0) {
    return (
      <div className="hakiscribe-card text-center py-12 space-y-3">
        <AlertCircle className="w-12 h-12 text-[#C9A86A] mx-auto" />
        <h3 className="text-xl font-bold text-[#0B3D2C]">No transcript available</h3>
        <p className="text-xs text-[#57534E]">Run speech recognition and diarization to generate segments.</p>
        <button
          type="button"
          onClick={onNavigateToTranscribe}
          className="px-5 py-2.5 bg-[#0B3D2C] text-[#FAF7F0] font-bold rounded-lg text-xs hover:bg-[#082E21]"
        >
          Go to Transcription
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

  const handleSaveTextEdit = async (newText: string, reason: string) => {
    try {
      const result = await ApiClient.editSegment(selectedSegment.id, newText, reviewer.trim(), reason);
      const updatedSegments = segments.map((s) => (s.id === selectedSegment.id ? result.segment : s));
      onSegmentsChange(updatedSegments);
      AppStorage.setSegments(updatedSegments);

      const updatedCorrections = [result.correction, ...corrections];
      onCorrectionsChange(updatedCorrections);
      AppStorage.setCorrections(updatedCorrections);
      notify(`Correction saved for Segment #${selectedSegment.idx}.`, 'success');
    } catch (err: any) {
      notify('Failed to save correction: ' + err.message, 'error');
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
      notify(`Flag #${flag.id} decided as ${decision}.`, 'success');
    } catch (err: any) {
      notify('Failed to record flag decision: ' + err.message, 'error');
    }
  };

  const handleRegisterParticipant = async (
    fullName: string,
    role: SpeakerRole,
    witnessDesignation: string | null,
    description: string | null
  ) => {
    try {
      const participant = await ApiClient.registerParticipant(
        recording.id,
        fullName,
        role,
        reviewer.trim(),
        witnessDesignation,
        description
      );
      const updated = [...participants, participant as any];
      onParticipantsChange(updated);
      AppStorage.setParticipants(updated);
      notify(`Registered ${fullName}. Verify the identity before assigning voices.`, 'success');
    } catch (err: any) {
      notify('Failed to register participant: ' + err.message, 'error');
    }
  };

  const handleVerifyParticipant = async (participant: CourtParticipant) => {
    try {
      const verified = await ApiClient.verifyParticipant(recording.id, participant.id, reviewer.trim());
      const updated = participants.map((p) => (p.id === participant.id ? (verified as any) : p));
      onParticipantsChange(updated);
      AppStorage.setParticipants(updated);
      notify(`Identity verified for ${participant.full_name}.`, 'success');
    } catch (err: any) {
      notify('Failed to verify participant: ' + err.message, 'error');
    }
  };

  const handleDeleteParticipant = async (participant: CourtParticipant) => {
    try {
      await ApiClient.deleteParticipant(recording.id, participant.id, reviewer.trim());
      const updated = participants.filter((p) => p.id !== participant.id);
      onParticipantsChange(updated);
      AppStorage.setParticipants(updated);
      const refreshedRoles = await ApiClient.getSpeakerRoles(recording.id);
      onSpeakerRolesChange(refreshedRoles as any);
      AppStorage.setSpeakerRoles(refreshedRoles as any);
      notify(`Removed ${participant.full_name}; linked voices are unidentified again.`, 'success');
    } catch (err: any) {
      notify('Failed to remove participant: ' + err.message, 'error');
    }
  };

  const handleAssignSpeaker = async (
    speakerLabel: string,
    participant: CourtParticipant | null,
    confirmed: boolean,
    reason?: string
  ) => {
    try {
      if (!participant) {
        await ApiClient.clearSpeakerRole(recording.id, speakerLabel, reviewer.trim(), reason);
        const updatedRoles = speakerRoles.filter((r) => r.speaker_label !== speakerLabel);
        onSpeakerRolesChange(updatedRoles);
        AppStorage.setSpeakerRoles(updatedRoles);
        const updatedSegments = segments.map((s) =>
          s.speaker_label === speakerLabel ? { ...s, speaker: s.speaker_label } : s
        );
        onSegmentsChange(updatedSegments);
        AppStorage.setSegments(updatedSegments);
        notify(`Voice "${speakerLabel}" marked unidentified on all turns.`, 'success');
        return;
      }

      const mapping = await ApiClient.assignSpeakerRole(
        recording.id,
        speakerLabel,
        participant.role,
        reviewer.trim(),
        reason,
        { participantId: participant.id, confirmed }
      );
      const updatedSegments = segments.map((s) =>
        s.speaker_label === speakerLabel ? { ...s, speaker: participant.role } : s
      );
      onSegmentsChange(updatedSegments);
      AppStorage.setSegments(updatedSegments);

      const existingIdx = speakerRoles.findIndex((r) => r.speaker_label === speakerLabel);
      const updatedRoles = existingIdx >= 0 ? [...speakerRoles] : [...speakerRoles, mapping as any];
      if (existingIdx >= 0) updatedRoles[existingIdx] = mapping as any;

      onSpeakerRolesChange(updatedRoles);
      AppStorage.setSpeakerRoles(updatedRoles);
      notify(`Assigned "${speakerLabel}" to ${participant.full_name} on all turns.`, 'success');
    } catch (err: any) {
      notify('Failed to assign speaker identity: ' + err.message, 'error');
    }
  };

  const segmentFlags = flags.filter((f) => f.segment_id === selectedSegment.id);
  const segmentHistory = corrections.filter((c) => c.segment_id === selectedSegment.id);
  const currentRoleMapping = speakerRoles.find((r) => r.speaker_label === selectedSegment.speaker_label);

  return (
    <div className="space-y-6">
      {/* Title & Top Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#E8D9B8]">
        <div>
          <h2 className="text-2xl font-bold text-[#0B3D2C] flex items-center gap-2">
            <span>Stage 3 â€” Human-in-the-Loop Transcript Review Desk</span>
          </h2>
          <p className="text-xs text-[#57534E] mt-0.5">
            File: <strong>{recording.filename}</strong> Â· Reviewer:{' '}
            <strong>{reviewer || 'Unassigned'}</strong> Â· Duration:{' '}
            <strong>{recording.duration_sec.toFixed(1)}s</strong>
            {isRunningAiReview && (
              <span className="ml-2 text-[#B45309] font-semibold">AI review runningâ€¦</span>
            )}
          </p>
        </div>

        {onNavigateToExport && (
          <button
            type="button"
            onClick={onNavigateToExport}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[#0B3D2C] hover:bg-[#082E21] text-[#FAF7F0] transition-colors shadow-xs self-start md:self-auto"
          >
            <span>Proceed to Export Draft</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#C9A86A]" />
          </button>
        )}
      </div>

      {/* AI Guardrail Summary Banner (when review has run) */}
      {aiReviewSummary && (
        <div className="p-3.5 bg-emerald-50/60 border border-emerald-300 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2 text-emerald-900 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-[#137333] shrink-0" />
            <span>
              AI Review complete: <strong>{aiReviewSummary.created}</strong> verified flags created Â·{' '}
              <strong>{aiReviewSummary.dropped}</strong> unquoted hallucinations rejected by strict quote guardrail.
            </span>
          </div>
          <span className="text-[10px] uppercase font-bold text-emerald-800 bg-white border border-emerald-200 px-2 py-0.5 rounded-full">
            Evidence Verified: 100%
          </span>
        </div>
      )}

      {/* Flag Jump Toolbar */}
      {unresolvedSegmentIndices.length > 0 && (
        <div className="p-2.5 bg-[#FAF7F0] border border-[#C9A86A] rounded-xl text-xs flex flex-wrap items-center gap-2">
          <span className="font-bold text-[#0B3D2C] flex items-center gap-1 text-[11px]">
            <AlertCircle className="w-3.5 h-3.5 text-[#B45309]" />
            Jump to segment with open flags ({openCount}):
          </span>
          {unresolvedSegmentIndices.map((idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedIdx(idx)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                selectedIdx === idx
                  ? 'bg-[#0B3D2C] text-white border-[#0B3D2C]'
                  : 'bg-white hover:bg-[#E8D9B8] text-[#0B3D2C] border-[#E8D9B8]'
              }`}
            >
              #{idx} ({unresolvedBySegment[idx].length})
            </button>
          ))}
        </div>
      )}

      {/* Proceeding Participant Register */}
      <ParticipantRegistry
        participants={participants}
        hasReviewer={hasReviewer}
        onRegister={handleRegisterParticipant}
        onVerify={handleVerifyParticipant}
        onDelete={handleDeleteParticipant}
        onNotify={onNotify}
      />

      {/* Main Review Grid: Left Segment List, Right Editor Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Segment List (5 cols) */}
        <div className="lg:col-span-5">
          <SegmentList
            segments={segments}
            selectedIdx={selectedIdx}
            onSelectSegment={(idx) => setSelectedIdx(idx)}
            flags={flags}
            corrections={corrections}
            speakerRoles={speakerRoles}
            participants={participants}
          />
        </div>

        {/* Right Column: Workspaces (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Dual-Pane Segment Workspace */}
          <SegmentWorkspace
            segment={selectedSegment}
            recording={recording}
            hasReviewer={hasReviewer}
            speakerRoles={speakerRoles}
            participants={participants}
            onSaveEdit={handleSaveTextEdit}
            onNotify={onNotify}
          />

          {/* AI Review Flags */}
          <FlagList
            flags={segmentFlags}
            hasReviewer={hasReviewer}
            onDecideFlag={handleDecideFlag}
            onNotify={onNotify}
          />

          {/* Speaker Identity Assignment */}
          <SpeakerParticipantAssigner
            key={selectedSegment.speaker_label}
            segment={selectedSegment}
            participants={participants}
            speakerRoles={speakerRoles}
            currentRoleMapping={currentRoleMapping}
            hasReviewer={hasReviewer}
            onAssign={handleAssignSpeaker}
            onNotify={onNotify}
          />

          {/* Segment Correction History */}
          <CorrectionHistory corrections={segmentHistory} />
        </div>
      </div>
    </div>
  );
};
