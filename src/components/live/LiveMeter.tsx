import React from 'react';
import { Mic } from 'lucide-react';

interface LiveMeterProps {
  elapsedSec: number;
  audioLevel: number;
  turnCount: number;
  formatElapsed: (sec: number) => string;
}

export const LiveMeter: React.FC<LiveMeterProps> = ({
  elapsedSec,
  audioLevel,
  turnCount,
  formatElapsed,
}) => {
  return (
    <div className="p-4 bg-[#082E21] text-[#FAF7F0] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#0B3D2C] border border-[#C9A86A] flex items-center justify-center">
          <Mic className="w-5 h-5 text-[#C9A86A] animate-pulse" />
        </div>
        <div>
          <div className="text-[10px] text-[#E8D9B8] font-bold uppercase tracking-wider">
            Session Duration
          </div>
          <div className="text-2xl font-mono font-bold text-[#FAF7F0]">
            {formatElapsed(elapsedSec)}
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-xs space-y-1">
        <div className="flex items-center justify-between text-[10px] text-[#E8D9B8]">
          <span>Microphone Input Signal</span>
          <span className="font-mono">{audioLevel}%</span>
        </div>
        <div className="w-full bg-[#0B3D2C] h-2 rounded-full overflow-hidden">
          <div
            className="bg-[#C9A86A] h-full transition-all duration-75"
            style={{ width: `${audioLevel}%` }}
          />
        </div>
      </div>

      <div className="text-right">
        <div className="text-[10px] text-[#E8D9B8] font-bold uppercase tracking-wider">
          Logged Turns
        </div>
        <div className="text-xl font-bold text-[#C9A86A]">{turnCount}</div>
      </div>
    </div>
  );
};
