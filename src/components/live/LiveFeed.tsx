import React from 'react';
import { Mic, Activity, FileText } from 'lucide-react';
import { LiveTurn } from '../../types';

interface LiveFeedProps {
  turns: LiveTurn[];
  partialText: string;
  formatElapsed: (sec: number) => string;
}

export const LiveFeed: React.FC<LiveFeedProps> = ({ turns, partialText, formatElapsed }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-[#0B3D2C] flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#C9A86A]" />
          <span>Progressive Speech Recognition Feed</span>
        </h3>
        <span className="text-xs text-[#78716C] font-mono">
          {turns.length} turns recorded
        </span>
      </div>

      <div className="hakiscribe-card min-h-[200px] max-h-[350px] overflow-y-auto space-y-3 p-4 bg-white">
        {turns.length === 0 && !partialText ? (
          <div className="text-center py-12 text-xs text-[#78716C] space-y-2">
            <Mic className="w-8 h-8 text-[#C9A86A] mx-auto opacity-50" />
            <p>Transcription turns will appear progressively as courtroom speech is detected.</p>
          </div>
        ) : (
          <>
            {turns.map((turn, i) => (
              <div
                key={i}
                className="p-3 bg-[#FAF7F0] border border-[#E8D9B8] rounded-lg text-xs space-y-1 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#0B3D2C] text-xs px-2 py-0.5 rounded bg-[#C9A86A]/20">
                    {turn.speaker}
                  </span>
                  <span className="text-[10px] text-[#78716C] font-mono">
                    {formatElapsed(turn.start_s)} - {formatElapsed(turn.end_s)}
                  </span>
                </div>
                <p className="text-[#1F2A24] font-medium leading-relaxed pt-1">{turn.text}</p>
              </div>
            ))}

            {partialText && (
              <div className="p-3 bg-amber-50/60 border border-amber-300 rounded-lg text-xs space-y-1 animate-pulse">
                <div className="flex items-center gap-1.5 text-amber-800 text-[10px] font-bold uppercase">
                  <Activity className="w-3 h-3" />
                  <span>Transcribing live speech...</span>
                </div>
                <p className="text-[#1F2A24] italic font-medium">{partialText}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
