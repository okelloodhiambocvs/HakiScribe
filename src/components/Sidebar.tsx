import React from 'react';
import { Mic, Activity, Info, ShieldAlert, Cpu } from 'lucide-react';
import { Step } from '../types';

interface SidebarProps {
  reviewer: string;
  onReviewerChange: (name: string) => void;
  mockMode: boolean;
  onMockModeChange: (val: boolean) => void;
  currentStep: Step;
  onNavigate: (step: Step) => void;
  onOpenDiagnostics: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  reviewer,
  onReviewerChange,
  mockMode,
  onMockModeChange,
  currentStep,
  onNavigate,
  onOpenDiagnostics,
}) => {
  return (
    <aside className="w-full md:w-72 bg-[#FFFFFF] border-r border-[#E8D9B8] p-4 flex flex-col gap-5 shrink-0 shadow-sm md:min-h-screen">
      {/* Brand Banner */}
      <div className="p-3 bg-[#FAF7F0] border border-[#C9A86A] rounded-lg text-xs leading-relaxed">
        <div className="font-bold text-[#0B3D2C] flex items-center gap-1.5 mb-1">
          <span className="w-2 h-2 rounded-full bg-[#137333] animate-pulse"></span>
          {mockMode ? 'MOCK MODE' : 'REAL MODE'}
        </div>
        <p className="text-[#1F2A24]">
          {mockMode
            ? 'Synthetic demo, no external network dependencies.'
            : 'Meta Model API calls active with diarization.'}
        </p>
        <label className="mt-2 flex items-center gap-2 cursor-pointer font-medium text-xs text-[#0B3D2C] pt-1 border-t border-[#E8D9B8]">
          <input
            type="checkbox"
            checked={mockMode}
            onChange={(e) => onMockModeChange(e.target.checked)}
            className="rounded text-[#0B3D2C] focus:ring-[#C9A86A]"
          />
          Force mock offline mode
        </label>
      </div>

      {/* Reviewer Input */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[#0B3D2C] mb-1.5">
          Reviewer Name <span className="text-[#B91C1C]">*</span>
        </label>
        <input
          type="text"
          value={reviewer}
          onChange={(e) => onReviewerChange(e.target.value)}
          placeholder="e.g. Karani Wa Mahakama / J. Clerk"
          className="w-full px-3 py-2 text-sm bg-[#FAF7F0] border border-[#C9A86A] rounded-lg text-[#1F2A24] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0B3D2C]"
        />
        {!reviewer.trim() && (
          <p className="text-[11px] text-[#B45309] font-medium mt-1">
            Required for auditable reviews & draft exports
          </p>
        )}
      </div>

      {/* Live Navigation CTA */}
      <div className="pt-1">
        <button
          onClick={() => onNavigate('live')}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            currentStep === 'live'
              ? 'bg-[#0B3D2C] text-[#FAF7F0] shadow-md'
              : 'bg-[#FAF7F0] text-[#0B3D2C] border border-[#C9A86A] hover:bg-[#E8D9B8]/50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Mic className="w-4 h-4 text-[#C9A86A]" />
            <span>Live transcription</span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#C9A86A]/30 text-[#0B3D2C]">
            Capture
          </span>
        </button>
      </div>

      {/* System Checks & Diagnostics CTA */}
      <div className="pt-2 border-t border-[#E8D9B8]/70 flex flex-col gap-2">
        <div className="text-xs font-bold text-[#78716C] uppercase tracking-wider">
          System & Audit
        </div>
        <button
          onClick={onOpenDiagnostics}
          className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-medium text-[#1F2A24] bg-[#FAF7F0] hover:bg-[#E8D9B8]/40 border border-[#E8D9B8] rounded-md transition-colors"
        >
          <Activity className="w-3.5 h-3.5 text-[#137333]" />
          <span>System Status & API Activity</span>
        </button>
      </div>

      {/* Rule Notice */}
      <div className="mt-auto pt-4 border-t border-[#E8D9B8] text-[11px] text-[#57534E] flex items-start gap-2">
        <ShieldAlert className="w-4 h-4 text-[#C9A86A] shrink-0 mt-0.5" />
        <p>
          <strong>RULE:</strong> AI proposes, HUMAN REVIEWS. All outputs are draft records only.
        </p>
      </div>
    </aside>
  );
};
