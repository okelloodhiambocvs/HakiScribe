import React from 'react';
import {
  LayoutDashboard,
  Upload,
  Mic,
  FileAudio,
  CheckSquare,
  Download,
  History,
  ShieldAlert,
  Info,
  BookOpen,
  User,
  Scale,
} from 'lucide-react';
import { Step } from '../types';

interface SidebarProps {
  reviewer: string;
  onReviewerChange: (name: string) => void;
  mockMode?: boolean;
  onMockModeChange?: (val: boolean) => void;
  currentStep: Step;
  onNavigate: (step: Step) => void;
  onOpenAbout: () => void;
  onOpenHowItWorks: () => void;
  hasRecording: boolean;
  hasTranscript: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  reviewer,
  onReviewerChange,
  currentStep,
  onNavigate,
  onOpenAbout,
  onOpenHowItWorks,
  hasRecording,
  hasTranscript,
}) => {
  const navItems: {
    id: Step;
    label: string;
    description: string;
    icon: React.ReactNode;
    badge?: string;
    disabled?: boolean;
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      description: 'Workflow overview and sessions',
      icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'upload',
      label: 'Audio Ingestion',
      description: 'Upload & validate hearing audio',
      icon: <Upload className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'live',
      label: 'Live Microphone',
      description: 'Progressive real-time capture',
      icon: <Mic className="w-4 h-4 shrink-0" />,
      badge: 'Live',
    },
    {
      id: 'transcribe',
      label: 'Transcription',
      description: 'Diarization & speech recognition',
      icon: <FileAudio className="w-4 h-4 shrink-0" />,
      disabled: !hasRecording,
    },
    {
      id: 'review',
      label: 'Review Desk',
      description: 'Human corrections & AI flags',
      icon: <CheckSquare className="w-4 h-4 shrink-0" />,
      disabled: !hasTranscript,
    },
    {
      id: 'export',
      label: 'Draft Export',
      description: 'Watermarked document drafts',
      icon: <Download className="w-4 h-4 shrink-0" />,
      disabled: !hasTranscript,
    },
    {
      id: 'history',
      label: 'Session Archive',
      description: 'Browse, search & audit sessions',
      icon: <History className="w-4 h-4 shrink-0" />,
    },
  ];

  return (
    <aside className="w-full md:w-72 bg-[#0B3D2C] border-r border-[#082E21] md:border-r-[#C9A86A]/20 p-4 flex flex-col justify-between shrink-0 shadow-lg md:min-h-screen text-[#FAF7F0]">
      {/* Top Section */}
      <div className="flex flex-col gap-4">
        {/* Brand identity badge */}
        <div className="flex items-center gap-3 pb-3 border-b border-[#C9A86A]/25">
          <div className="w-10 h-10 rounded-xl bg-[#082E21] border border-[#C9A86A] flex items-center justify-center shrink-0 shadow-xs">
            <Scale className="w-5 h-5 text-[#C9A86A]" />
          </div>
          <div className="min-w-0">
            <div className="text-base font-extrabold text-white tracking-tight truncate">
              HakiScribe-AI
            </div>
            <div className="text-[11px] font-bold text-[#C9A86A] uppercase tracking-wider">
              Judicial Review Desk
            </div>
          </div>
        </div>

        {/* Reviewer / Authorised Officer Identification */}
        <div className="bg-[#082E21]/90 p-3 rounded-xl border border-[#C9A86A]/35 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#C9A86A] flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#C9A86A]" />
              Reviewer Name <span className="text-[#FCA5A5]">*</span>
            </label>
          </div>
          <input
            type="text"
            value={reviewer}
            onChange={(e) => onReviewerChange(e.target.value)}
            placeholder="e.g. Karani Wa Mahakama"
            className="w-full px-2.5 py-1.5 text-xs bg-[#051F16] border border-[#C9A86A]/60 rounded-md text-[#FAF7F0] placeholder-[#E8D9B8]/40 focus:outline-none focus:ring-1 focus:ring-[#C9A86A]"
            aria-label="Reviewer full name"
          />
          {!reviewer.trim() ? (
            <p className="text-[10px] text-[#FDE68A] font-semibold mt-1.5">
              Reviewer identity required for official audit ledger
            </p>
          ) : (
            <p className="text-[10px] text-[#86EFAC] font-semibold mt-1.5 truncate">
              Signed in: {reviewer}
            </p>
          )}
        </div>

        {/* Primary Navigation Menu */}
        <nav aria-label="Main navigation" className="flex flex-col gap-1.5">
          <div className="text-[10px] font-bold text-[#C9A86A] uppercase tracking-wider px-2 py-1">
            Workflow Actions
          </div>
          {navItems.map((item) => {
            const isActive = currentStep === item.id;
            return (
              <button
                key={item.id}
                type="button"
                disabled={item.disabled}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition-all text-left ${
                  isActive
                    ? 'bg-[#C9A86A] text-[#0B3D2C] shadow-md'
                    : item.disabled
                    ? 'text-white/35 bg-transparent cursor-not-allowed opacity-45'
                    : 'text-[#FAF7F0] hover:bg-[#082E21] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={isActive ? 'text-[#0B3D2C]' : 'text-[#C9A86A]'}>
                    {item.icon}
                  </span>
                  <div className="truncate">
                    <div className="leading-tight">{item.label}</div>
                  </div>
                </div>
                {item.badge && (
                  <span
                    className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                      isActive
                        ? 'bg-[#0B3D2C] text-[#FAF7F0]'
                        : 'bg-[#C9A86A]/30 text-[#FAF7F0]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Dedicated Footer Area at the bottom of the left section */}
      <div className="mt-6 pt-4 border-t border-[#C9A86A]/20 flex flex-col gap-2.5">
        <div className="text-[10px] font-bold text-[#C9A86A] uppercase tracking-wider px-1">
          Information & Help
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onOpenAbout}
            className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-md bg-[#082E21] hover:bg-[#051F16] text-[#FAF7F0] border border-[#C9A86A]/40 font-bold text-xs transition-colors shadow-2xs"
          >
            <Info className="w-3.5 h-3.5 text-[#C9A86A]" />
            <span>About Us</span>
          </button>

          <button
            type="button"
            onClick={onOpenHowItWorks}
            className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-md bg-[#082E21] hover:bg-[#051F16] text-[#FAF7F0] border border-[#C9A86A]/40 font-bold text-xs transition-colors shadow-2xs"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#C9A86A]" />
            <span>How It Works</span>
          </button>
        </div>

        <div className="p-2.5 bg-[#082E21] border border-[#C9A86A]/30 rounded-lg text-[10px] text-[#E8D9B8] leading-normal flex items-start gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-[#C9A86A] shrink-0 mt-0.5" />
          <p>
            <strong className="text-white">Judicial Rule:</strong> AI proposes, human reviews. All transcripts require verification.
          </p>
        </div>
      </div>
    </aside>
  );
};
