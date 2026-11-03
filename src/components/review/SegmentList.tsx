import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { Flag, Segment } from '../../types';
import { getSpeakerBadgeStyle } from '../../constants/brand';

interface SegmentListProps {
  segments: Segment[];
  selectedIdx: number;
  onSelectSegment: (idx: number) => void;
  flags: Flag[];
}

export const SegmentList: React.FC<SegmentListProps> = ({
  segments,
  selectedIdx,
  onSelectSegment,
  flags,
}) => {
  return (
    <div className="hakiscribe-card space-y-3">
      <div className="flex items-center justify-between border-b border-[#E8D9B8] pb-2">
        <h3 className="text-sm font-bold text-[#0B3D2C] uppercase tracking-wider">
          Hearing Segments ({segments.length})
        </h3>
        <span className="text-xs text-[#78716C]">Select to review</span>
      </div>

      <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
        {segments.map((seg) => {
          const isSelected = seg.idx === selectedIdx;
          const segFlags = flags.filter((f) => f.segment_id === seg.id);
          const unres = segFlags.filter((f) => f.status === 'OPEN' || f.status === 'RETAINED');
          const isEdited = seg.text_current !== seg.text_original;
          const badge = getSpeakerBadgeStyle(seg.speaker);

          return (
            <div
              key={seg.id}
              onClick={() => onSelectSegment(seg.idx)}
              className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                isSelected
                  ? 'bg-[#FAF7F0] border-[#0B3D2C] shadow-sm ring-2 ring-[#0B3D2C]'
                  : 'bg-white border-[#E8D9B8] hover:border-[#C9A86A]'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span
                    className="px-2 py-0.5 rounded-full font-bold text-[10px]"
                    style={{ backgroundColor: badge.bg, color: badge.text }}
                  >
                    {seg.speaker}
                  </span>
                  {seg.speaker !== seg.speaker_label && (
                    <span className="text-[10px] text-gray-500 font-mono">
                      ({seg.speaker_label})
                    </span>
                  )}
                </div>
                <span className="font-mono text-[10px] text-gray-500">
                  {seg.start_sec.toFixed(1)}s – {seg.end_sec.toFixed(1)}s
                </span>
              </div>

              <p className="font-medium text-[#1F2A24] line-clamp-2 leading-relaxed">
                {seg.text_current}
              </p>

              <div className="flex items-center justify-between mt-2 pt-1 border-t border-gray-100 text-[10px]">
                <div className="flex items-center gap-2">
                  {unres.length > 0 ? (
                    <span className="bg-[#B45309]/15 text-[#B45309] font-bold px-1.5 py-0.2 rounded flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {unres.length} issue{unres.length > 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="text-[#137333] font-medium flex items-center gap-0.5">
                      <CheckCircle className="w-3 h-3" />
                      Clean
                    </span>
                  )}

                  {isEdited && (
                    <span className="text-[#7C2D12] bg-[#7C2D12]/10 font-bold px-1.5 py-0.2 rounded">
                      Edited
                    </span>
                  )}
                </div>

                <span className="text-gray-400 font-mono">Seg #{seg.idx}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
