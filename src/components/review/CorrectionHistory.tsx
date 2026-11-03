import React from 'react';
import { History } from 'lucide-react';
import { Correction } from '../../types';

interface CorrectionHistoryProps {
  corrections: Correction[];
}

export const CorrectionHistory: React.FC<CorrectionHistoryProps> = ({ corrections }) => {
  return (
    <div className="hakiscribe-card space-y-3">
      <h3 className="text-sm font-bold text-[#0B3D2C] uppercase tracking-wider border-b border-[#E8D9B8] pb-2 flex items-center gap-1.5">
        <History className="w-4 h-4 text-[#C9A86A]" />
        <span>Correction History on this Segment ({corrections.length})</span>
      </h3>

      {corrections.length === 0 ? (
        <p className="text-xs text-gray-500 italic py-1">No human edits recorded yet.</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {corrections.map((corr) => (
            <div
              key={corr.id}
              className="p-2.5 bg-[#FAF7F0] border border-[#E8D9B8] rounded-lg text-xs space-y-1 font-mono"
            >
              <div className="flex items-center justify-between text-gray-500 text-[10px]">
                <span>
                  {corr.created_at.slice(0, 19).replace('T', ' ')} · {corr.reviewer_name}
                </span>
                <span className="font-bold text-[#0B3D2C]">[{corr.field}]</span>
              </div>
              <div className="text-[#1F2A24] font-medium text-[11px]">
                <span className="text-red-700 line-through mr-1">{corr.before_text}</span>
                <span className="text-[#137333] font-bold">→ {corr.after_text}</span>
              </div>
              {corr.reason && (
                <div className="text-[10px] text-gray-600 font-sans italic">
                  Reason: {corr.reason}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
