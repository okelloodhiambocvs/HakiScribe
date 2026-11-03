import React from 'react';
import { Upload, FileAudio, CheckSquare, Download } from 'lucide-react';
import { Step } from '../types';

interface StepperProps {
  currentStep: Step;
  onSelectStep: (step: Step) => void;
  hasRecording: boolean;
  hasTranscript: boolean;
}

export const Stepper: React.FC<StepperProps> = ({
  currentStep,
  onSelectStep,
  hasRecording,
  hasTranscript,
}) => {
  const steps: { id: Step; label: string; icon: React.ReactNode; enabled: boolean }[] = [
    { id: 'upload', label: '1. Upload', icon: <Upload className="w-4 h-4" />, enabled: true },
    {
      id: 'transcribe',
      label: '2. Transcribe',
      icon: <FileAudio className="w-4 h-4" />,
      enabled: hasRecording,
    },
    {
      id: 'review',
      label: '3. Review transcript',
      icon: <CheckSquare className="w-4 h-4" />,
      enabled: hasTranscript,
    },
    {
      id: 'export',
      label: '4. Download document',
      icon: <Download className="w-4 h-4" />,
      enabled: hasTranscript,
    },
  ];

  return (
    <div className="w-full mb-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3">
        {steps.map((s) => {
          const isActive = currentStep === s.id;
          return (
            <button
              key={s.id}
              disabled={!s.enabled}
              onClick={() => onSelectStep(s.id)}
              className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl font-bold text-sm transition-all duration-150 border ${
                isActive
                  ? 'bg-[#0B3D2C] text-[#FAF7F0] border-[#0B3D2C] shadow-md scale-[1.01]'
                  : s.enabled
                  ? 'bg-[#FFFFFF] text-[#0B3D2C] border-[#E8D9B8] hover:bg-[#FAF7F0] hover:border-[#C9A86A]'
                  : 'bg-[#FAF7F0]/60 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
              }`}
            >
              <span className={isActive ? 'text-[#C9A86A]' : s.enabled ? 'text-[#0B3D2C]' : 'text-gray-400'}>
                {s.icon}
              </span>
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
