import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Quote,
  AlertTriangle,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { Flag, FlagType } from '../../types';

interface FlagListProps {
  flags: Flag[];
  hasReviewer: boolean;
  onDecideFlag: (
    flag: Flag,
    decision: 'ACCEPT' | 'DISMISS' | 'RETAIN',
    reason: string,
    suggestionText?: string
  ) => void;
  onNotify?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const FlagList: React.FC<FlagListProps> = ({
  flags,
  hasReviewer,
  onDecideFlag,
  onNotify,
}) => {
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleAction = (
    flag: Flag,
    decision: 'ACCEPT' | 'DISMISS' | 'RETAIN',
    suggestionText?: string
  ) => {
    if (!hasReviewer) {
      const msg = 'Enter your reviewer name in the left panel first.';
      setValidationError(msg);
      if (onNotify) onNotify(msg, 'warning');
      return;
    }

    const inputReason = (reasons[flag.id] || '').trim();
    if (!inputReason && decision !== 'ACCEPT') {
      const msg = 'Please specify a reason before dismissing or retaining a flag.';
      setValidationError(msg);
      if (onNotify) onNotify(msg, 'warning');
      return;
    }

    setValidationError(null);
    const reasonToSave = inputReason || (decision === 'ACCEPT' ? 'Accepted AI suggestion' : '');
    onDecideFlag(flag, decision, reasonToSave, suggestionText);

    setReasons((prev) => ({ ...prev, [flag.id]: '' }));
    if (onNotify) {
      onNotify(
        `Flag #${flag.id} (${flag.flag_type}) decided as ${decision}.`,
        'success'
      );
    }
  };

  const filteredFlags = flags.filter((f) => {
    if (categoryFilter === 'ALL') return true;
    if (categoryFilter === 'UNCLEAR') return f.flag_type === 'UNCLEAR_PASSAGE';
    if (categoryFilter === 'LEGAL') return f.flag_type === 'LEGAL_TERM';
    if (categoryFilter === 'SPEAKER') return f.flag_type === 'SPEAKER_ATTRIBUTION';
    if (categoryFilter === 'NUMBERS') return f.flag_type === 'NUMBER_OR_DATE';
    if (categoryFilter === 'LANGUAGE') return f.flag_type === 'LANGUAGE_SWITCH';
    return true;
  });

  return (
    <div className="hakiscribe-card space-y-4">
      {/* Header & Category Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8D9B8] pb-3">
        <h3 className="text-xs font-bold text-[#0B3D2C] uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-[#C9A86A]" />
          <span>AI Review Guardrail Flags ({flags.length})</span>
        </h3>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1 text-[10px]">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'UNCLEAR', label: 'Unclear' },
            { id: 'LEGAL', label: 'Legal Terms' },
            { id: 'SPEAKER', label: 'Attribution' },
            { id: 'NUMBERS', label: 'Numbers & Dates' },
            { id: 'LANGUAGE', label: 'Code-Switching' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
                categoryFilter === cat.id
                  ? 'bg-[#0B3D2C] text-white'
                  : 'bg-[#FAF7F0] text-[#78716C] hover:bg-[#E8D9B8]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {validationError && (
        <div className="p-2.5 bg-amber-50 border border-[#B45309] rounded-lg text-xs font-medium text-[#B45309]">
          {validationError}
        </div>
      )}

      {filteredFlags.length === 0 ? (
        <div className="text-center py-6 text-xs text-[#78716C] space-y-1">
          <p className="italic">No flags under the "{categoryFilter}" category on this segment.</p>
          <p className="text-[10px]">AI review runs automatically when the desk opens with a new transcript.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFlags.map((flag) => {
            const isResolved = flag.status === 'RESOLVED';
            const isDismissed = flag.status === 'DISMISSED';
            const isRetained = flag.status === 'RETAINED';
            const isOpen = flag.status === 'OPEN';
            const currentReason = reasons[flag.id] || '';

            return (
              <div
                key={flag.id}
                className={`p-3.5 rounded-xl border text-xs space-y-2.5 transition-all ${
                  isResolved
                    ? 'bg-emerald-50/40 border-emerald-300'
                    : isDismissed
                    ? 'bg-stone-50 border-stone-200 opacity-75'
                    : isRetained
                    ? 'bg-amber-50/50 border-amber-300'
                    : 'bg-[#FAF7F0] border-[#C9A86A] shadow-xs'
                }`}
              >
                {/* Flag Header: Category, Severity, Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#0B3D2C] bg-white px-2 py-0.5 rounded border border-[#E8D9B8] text-[10px] uppercase tracking-wider">
                      {flag.flag_type.replace(/_/g, ' ')}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-extrabold text-[9px] uppercase tracking-wider ${
                        flag.severity === 'HIGH'
                          ? 'bg-red-100 text-[#B91C1C]'
                          : flag.severity === 'MEDIUM'
                          ? 'bg-amber-100 text-[#B45309]'
                          : 'bg-stone-100 text-stone-700'
                      }`}
                    >
                      {flag.severity}
                    </span>
                  </div>

                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${
                      isResolved
                        ? 'bg-emerald-100 text-emerald-800'
                        : isDismissed
                        ? 'bg-stone-200 text-stone-700'
                        : isRetained
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}
                  >
                    {flag.status}
                  </span>
                </div>

                {/* Verbatim Quoted Evidence Guardrail */}
                <div className="bg-white p-2.5 rounded-lg border border-[#E8D9B8] text-[11px] text-[#1F2A24] space-y-1">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-[#78716C] uppercase">
                    <Quote className="w-3 h-3 text-[#C9A86A]" />
                    <span>Verbatim Evidence Quote:</span>
                  </div>
                  <div className="font-mono italic text-[#0B3D2C] pl-2 border-l-2 border-[#C9A86A]">
                    "{flag.evidence}"
                  </div>
                </div>

                {/* Explanation */}
                <p className="text-[#1F2A24] font-medium leading-relaxed">{flag.message}</p>

                {/* AI Suggestion */}
                {flag.suggestion && (
                  <div className="p-2.5 bg-white border border-[#C9A86A] rounded-lg text-[11px] space-y-1">
                    <div className="text-[10px] font-bold text-[#0B3D2C] uppercase flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#C9A86A]" />
                      <span>Suggested Modification:</span>
                    </div>
                    <div className="font-medium text-[#0B3D2C] pl-2 border-l-2 border-[#137333]">
                      "{flag.suggestion}"
                    </div>
                  </div>
                )}

                {/* Review Actions (when open or retained) */}
                {isOpen || isRetained ? (
                  <div className="pt-2 border-t border-[#E8D9B8] space-y-2">
                    <input
                      type="text"
                      placeholder="Reason for flag decision (mandatory for dismiss/retain)..."
                      value={currentReason}
                      onChange={(e) => {
                        setReasons({ ...reasons, [flag.id]: e.target.value });
                        setValidationError(null);
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#C9A86A] rounded-lg text-xs text-[#1F2A24] focus:outline-none focus:ring-1 focus:ring-[#0B3D2C]"
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      {flag.suggestion && (
                        <button
                          type="button"
                          onClick={() => handleAction(flag, 'ACCEPT', flag.suggestion!)}
                          className="flex items-center gap-1 px-3 py-1 bg-[#137333] hover:bg-[#0e5726] text-white font-bold rounded-lg text-xs transition-colors shadow-2xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Accept Suggestion</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleAction(flag, 'DISMISS')}
                        className="flex items-center gap-1 px-3 py-1 bg-white hover:bg-[#FAF7F0] text-[#1F2A24] border border-[#E8D9B8] font-semibold rounded-lg text-xs transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5 text-[#B91C1C]" />
                        <span>Dismiss Flag</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAction(flag, 'RETAIN')}
                        className="flex items-center gap-1 px-3 py-1 bg-[#FAF7F0] hover:bg-[#E8D9B8] text-[#0B3D2C] border border-[#C9A86A] font-semibold rounded-lg text-xs transition-colors"
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-[#B45309]" />
                        <span>Retain for Review</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-[#78716C] italic pt-1 border-t border-[#E8D9B8]">
                    Decided by <strong>{flag.resolved_by || 'Reviewer'}</strong> as{' '}
                    <strong className="uppercase">{flag.status}</strong>
                    {flag.reason ? ` Â· Reason: "${flag.reason}"` : ''}
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
