import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Flag } from '../../types';

interface FlagListProps {
  flags: Flag[];
  hasReviewer: boolean;
  onDecideFlag: (
    flag: Flag,
    decision: 'ACCEPT' | 'DISMISS' | 'RETAIN',
    reason: string,
    suggestionText?: string
  ) => void;
}

export const FlagList: React.FC<FlagListProps> = ({
  flags,
  hasReviewer,
  onDecideFlag,
}) => {
  const [reasons, setReasons] = useState<Record<number, string>>({});

  const handleAction = (
    flag: Flag,
    decision: 'ACCEPT' | 'DISMISS' | 'RETAIN',
    suggestionText?: string
  ) => {
    if (!hasReviewer) {
      alert('Add your reviewer name in the sidebar first.');
      return;
    }

    const inputReason = (reasons[flag.id] || '').trim();
    if (!inputReason && decision !== 'ACCEPT') {
      alert('Please enter a reason for this decision.');
      return;
    }

    const reasonToSave = inputReason || (decision === 'ACCEPT' ? 'Accepted AI suggestion' : '');
    onDecideFlag(flag, decision, reasonToSave, suggestionText);

    setReasons((prev) => ({ ...prev, [flag.id]: '' }));
  };

  return (
    <div className="hakiscribe-card space-y-3">
      <div className="flex items-center justify-between border-b border-[#E8D9B8] pb-2">
        <h3 className="text-sm font-bold text-[#0B3D2C] uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-[#C9A86A]" />
          <span>AI Review Flags on this Segment ({flags.length})</span>
        </h3>
      </div>

      {flags.length === 0 ? (
        <p className="text-xs text-gray-500 italic py-2">
          No flags on this segment. Run "Run AI review (Spark)" to detect issues.
        </p>
      ) : (
        <div className="space-y-3">
          {flags.map((flag) => {
            const isResolved = flag.status === 'RESOLVED';
            const isDismissed = flag.status === 'DISMISSED';
            const isRetained = flag.status === 'RETAINED';
            const currentReason = reasons[flag.id] || '';

            return (
              <div
                key={flag.id}
                className={`p-3.5 rounded-xl border text-xs space-y-2.5 ${
                  isResolved
                    ? 'bg-green-50/50 border-green-200'
                    : isDismissed
                    ? 'bg-gray-50 border-gray-200'
                    : isRetained
                    ? 'bg-amber-50/50 border-amber-200'
                    : 'bg-[#FAF7F0] border-[#C9A86A]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#0B3D2C] bg-white px-2 py-0.5 rounded border border-[#E8D9B8]">
                      {flag.flag_type}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        flag.severity === 'HIGH'
                          ? 'bg-red-100 text-red-800'
                          : flag.severity === 'MEDIUM'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {flag.severity}
                    </span>
                  </div>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                      isResolved
                        ? 'bg-green-100 text-green-800'
                        : isDismissed
                        ? 'bg-gray-200 text-gray-700'
                        : isRetained
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {flag.status}
                  </span>
                </div>

                <div className="text-[11px] bg-white p-2 rounded border border-[#E8D9B8] text-gray-800">
                  <strong className="text-[#0B3D2C]">Quote:</strong> "{flag.evidence}"
                </div>

                <p className="text-gray-800 font-medium">{flag.message}</p>

                {flag.suggestion && (
                  <div className="p-2 bg-blue-50/70 border border-blue-200 rounded text-blue-900 text-[11px]">
                    <strong>Suggestion:</strong> "{flag.suggestion}"
                  </div>
                )}

                {flag.status === 'OPEN' || flag.status === 'RETAINED' ? (
                  <div className="pt-2 border-t border-gray-200 space-y-2">
                    <input
                      type="text"
                      placeholder="Reason for flag decision (required for dismiss/retain)"
                      value={currentReason}
                      onChange={(e) =>
                        setReasons({ ...reasons, [flag.id]: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded text-xs focus:ring-1 focus:ring-[#0B3D2C]"
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      {flag.suggestion && (
                        <button
                          onClick={() => handleAction(flag, 'ACCEPT', flag.suggestion!)}
                          className="px-3 py-1 bg-[#137333] hover:bg-[#0e5726] text-white font-bold rounded text-xs"
                        >
                          Accept Suggestion
                        </button>
                      )}

                      <button
                        onClick={() => handleAction(flag, 'DISMISS')}
                        className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded text-xs"
                      >
                        Dismiss Flag
                      </button>

                      <button
                        onClick={() => handleAction(flag, 'RETAIN')}
                        className="px-3 py-1 bg-[#C9A86A] hover:bg-[#B39356] text-[#0B3D2C] font-semibold rounded text-xs"
                      >
                        Retain as Uncertain
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-gray-500 italic pt-1">
                    Decided: <strong>{flag.status}</strong> by{' '}
                    {flag.resolved_by || 'reviewer'}{' '}
                    {flag.reason ? `(Reason: ${flag.reason})` : ''}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
