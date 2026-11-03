import React, { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { Correction, CourtParticipant, Flag, Segment, SpeakerRoleMapping } from '../../types';
import { getSpeakerBadgeStyle } from '../../constants/brand';
import { resolveSegmentSpeaker } from '../../../shared/participants';
import { computeReviewState } from '../../../shared/reviewState';

interface SegmentListProps {
  segments: Segment[];
  selectedIdx: number;
  onSelectSegment: (idx: number) => void;
  flags: Flag[];
  corrections: Correction[];
  speakerRoles: SpeakerRoleMapping[];
  participants: CourtParticipant[];
}

type ReviewFilter = 'ALL' | 'NEEDS_REVIEW' | 'CLEARED' | 'UNIDENTIFIED';

const FILTER_OPTIONS: { id: ReviewFilter; label: string }[] = [
  { id: 'ALL', label: 'All passages' },
  { id: 'NEEDS_REVIEW', label: 'Needs review' },
  { id: 'CLEARED', label: 'Cleared' },
  { id: 'UNIDENTIFIED', label: 'Unidentified' },
];

export const SegmentList: React.FC<SegmentListProps> = ({
  segments,
  selectedIdx,
  onSelectSegment,
  flags,
  corrections,
  speakerRoles,
  participants,
}) => {
  const [filter, setFilter] = useState<ReviewFilter>('ALL');

  const states = useMemo(() => {
    return new Map(
      segments.map((seg) => {
        const resolved = resolveSegmentSpeaker(seg.speaker_label, speakerRoles, participants);
        const state = computeReviewState({
          segmentId: seg.id,
          segmentIdx: seg.idx,
          textCurrent: seg.text_current,
          confidence: seg.confidence,
          flags,
          corrections: corrections.filter((c) => c.segment_id === seg.id),
          speakerIdentified: resolved.identified,
          speakerIdentityReason: resolved.identified ? null : 'Speaker identity not verified.',
        });
        return [seg.id, { resolved, state }] as const;
      })
    );
  }, [segments, flags, corrections, speakerRoles, participants]);

  const counts = useMemo(() => {
    let needs = 0;
    let cleared = 0;
    let unidentified = 0;
    states.forEach(({ resolved, state }) => {
      if (state.status === 'NEEDS_REVIEW') needs += 1;
      else cleared += 1;
      if (!resolved.identified) unidentified += 1;
    });
    return { ALL: segments.length, NEEDS_REVIEW: needs, CLEARED: cleared, UNIDENTIFIED: unidentified };
  }, [states, segments.length]);

  const visibleSegments = segments.filter((seg) => {
    const entry = states.get(seg.id);
    if (!entry) return true;
    if (filter === 'NEEDS_REVIEW') return entry.state.status === 'NEEDS_REVIEW';
    if (filter === 'CLEARED') return entry.state.status === 'CLEARED';
    if (filter === 'UNIDENTIFIED') return !entry.resolved.identified;
    return true;
  });

  return (
    <div className="hakiscribe-card space-y-3">
      <div className="flex items-center justify-between border-b border-[#E8D9B8] pb-2">
        <h3 className="text-sm font-bold text-[#0B3D2C] uppercase tracking-wider">
          Hearing Segments ({segments.length})
        </h3>
        <span className="text-xs text-[#78716C]">Select to review</span>
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter segments by review state">
        {FILTER_OPTIONS.map((opt) => {
          const isActive = filter === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setFilter(opt.id)}
              aria-pressed={isActive}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
                isActive
                  ? 'bg-[#0B3D2C] text-white'
                  : 'bg-[#FAF7F0] text-[#57534E] border border-[#E8D9B8] hover:bg-[#E8D9B8]'
              }`}
            >
              {opt.label} ({counts[opt.id]})
            </button>
          );
        })}
      </div>

      <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
        {visibleSegments.length === 0 && (
          <p className="text-xs text-gray-500 italic py-4 text-center">
            No passages match this filter.
          </p>
        )}
        {visibleSegments.map((seg) => {
          const entry = states.get(seg.id);
          const isSelected = seg.idx === selectedIdx;
          const isEdited = seg.text_current !== seg.text_original;
          const badge = getSpeakerBadgeStyle(seg.speaker);
          const needsReview = entry?.state.status === 'NEEDS_REVIEW';
          const reasons = entry?.state.reasons || [];

          return (
            <div
              key={seg.id}
              onClick={() => onSelectSegment(seg.idx)}
              className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                isSelected
                  ? 'bg-[#FAF7F0] border-[#0B3D2C] shadow-sm ring-2 ring-[#0B3D2C]'
                  : needsReview
                  ? 'bg-red-50/50 border-red-300 hover:border-[#B91C1C]'
                  : 'bg-emerald-50/40 border-emerald-200 hover:border-[#137333]'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="px-2 py-0.5 rounded-full font-bold text-[10px] truncate"
                    style={{ backgroundColor: badge.bg, color: badge.text }}
                    title={entry?.resolved.heading}
                  >
                    {entry?.resolved.heading || seg.speaker}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-gray-500 shrink-0">
                  {seg.start_sec.toFixed(1)}s â€“ {seg.end_sec.toFixed(1)}s
                </span>
              </div>

              <p className="font-medium text-[#1F2A24] line-clamp-2 leading-relaxed">
                {seg.text_current}
              </p>

              <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-gray-100 text-[10px]">
                <div className="flex items-center gap-2 flex-wrap">
                  {needsReview ? (
                    <span className="bg-red-100 text-[#B91C1C] border border-red-300 font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      NEEDS REVIEW
                    </span>
                  ) : (
                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      {entry?.state.verifiedByHuman ? 'CLEARED Â· HUMAN VERIFIED' : 'CLEARED Â· NO ISSUES DETECTED'}
                    </span>
                  )}
                  {isEdited && (
                    <span className="text-[#7C2D12] bg-[#7C2D12]/10 font-bold px-1.5 py-0.5 rounded">
                      Edited
                    </span>
                  )}
                </div>
                <span className="text-gray-400 font-mono shrink-0">Seg #{seg.idx}</span>
              </div>

              {needsReview && reasons.length > 0 && (
                <p className="mt-1.5 text-[10px] text-[#B91C1C] font-medium leading-snug">
                  {reasons[0]}
                  {reasons.length > 1 ? ` (+${reasons.length - 1} more)` : ''}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
