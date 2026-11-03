import React from 'react';
import { Mic, Square, Play, Pause, RefreshCw, FileText } from 'lucide-react';

interface LiveControlsProps {
  status: string;
  consent: boolean;
  reviewer: string;
  isProcessing: boolean;
  turnCount: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onTransfer: () => void;
  onReset: () => void;
}

export const LiveControls: React.FC<LiveControlsProps> = ({
  status,
  consent,
  reviewer,
  isProcessing,
  turnCount,
  onStart,
  onPause,
  onResume,
  onStop,
  onTransfer,
  onReset,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-3 pt-1">
      {status === 'idle' && (
        <button
          type="button"
          disabled={!consent || !reviewer.trim() || isProcessing}
          onClick={onStart}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
            consent && reviewer.trim() && !isProcessing
              ? 'bg-[#0B3D2C] hover:bg-[#082E21] text-[#FAF7F0]'
              : 'bg-stone-200 text-stone-400 cursor-not-allowed'
          }`}
        >
          <Mic className="w-4 h-4 text-[#C9A86A]" />
          <span>{isProcessing ? 'Requesting Access...' : 'Request Mic & Start Recording'}</span>
        </button>
      )}

      {(status === 'recording' || status === 'transcribing') && (
        <>
          <button
            type="button"
            onClick={onPause}
            className="flex items-center gap-2 px-4 py-2 bg-[#FAF7F0] hover:bg-[#E8D9B8] text-[#0B3D2C] border border-[#C9A86A] rounded-lg text-xs font-bold transition-colors"
          >
            <Pause className="w-4 h-4" />
            <span>Pause</span>
          </button>
          <button
            type="button"
            onClick={onStop}
            className="flex items-center gap-2 px-5 py-2 bg-[#B91C1C] hover:bg-red-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
          >
            <Square className="w-4 h-4" />
            <span>Stop Recording</span>
          </button>
        </>
      )}

      {status === 'paused' && (
        <>
          <button
            type="button"
            onClick={onResume}
            className="flex items-center gap-2 px-4 py-2 bg-[#0B3D2C] hover:bg-[#082E21] text-[#FAF7F0] rounded-lg text-xs font-bold transition-colors shadow-xs"
          >
            <Play className="w-4 h-4 text-[#C9A86A]" />
            <span>Resume Recording</span>
          </button>
          <button
            type="button"
            onClick={onStop}
            className="flex items-center gap-2 px-5 py-2 bg-[#B91C1C] hover:bg-red-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
          >
            <Square className="w-4 h-4" />
            <span>Conclude Session</span>
          </button>
        </>
      )}

      {status === 'completed' && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onTransfer}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#0B3D2C] hover:bg-[#082E21] text-[#FAF7F0] rounded-lg text-xs font-bold transition-colors shadow-sm"
          >
            <FileText className="w-4 h-4 text-[#C9A86A]" />
            <span>Transfer {turnCount} Turns to Review Desk</span>
          </button>
          <button
            type="button"
            onClick={onReset}
            className="px-4 py-2 bg-[#FAF7F0] hover:bg-[#E8D9B8] text-[#1F2A24] border border-[#E8D9B8] rounded-lg text-xs font-semibold"
          >
            Start New Session
          </button>
        </div>
      )}

      {status === 'failed' && (
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#FAF7F0] hover:bg-[#E8D9B8] text-[#0B3D2C] border border-[#C9A86A] rounded-lg text-xs font-bold"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Microphone Setup</span>
        </button>
      )}
    </div>
  );
};
