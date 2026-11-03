import React from 'react';
import { ArrowLeft, Upload, FileAudio, CheckSquare, Download, ShieldCheck } from 'lucide-react';

interface HowItWorksViewProps {
  onBack: () => void;
}

export const HowItWorksView: React.FC<HowItWorksViewProps> = ({ onBack }) => {
  const steps = [
    {
      num: '1',
      title: 'Upload and Validate',
      icon: <Upload className="w-5 h-5 text-[#0B3D2C]" />,
      desc: 'Enter your reviewer name in the sidebar, choose a synthetic or consented recording, tick the attestation, and upload — or load the built-in demo recording. Files are validated for supported format (MP3, WAV, M4A, etc.), checked against the 25MB threshold, and fingerprinted with a SHA-256 cryptographic hash.',
    },
    {
      num: '2',
      title: 'Transcribe with Diarization',
      icon: <FileAudio className="w-5 h-5 text-[#0B3D2C]" />,
      desc: 'Muse Voice Transcribe in DIARIZATION mode segments speech into distinct speaker turns with accurate start and end timestamps. The original AI text is locked into an immutable audit column. In parallel, live microphone capture with speaker consent is available from the sidebar and can be finalized with a batch pass.',
    },
    {
      num: '3',
      title: 'Review Transcript (Human-in-the-Loop)',
      icon: <CheckSquare className="w-5 h-5 text-[#0B3D2C]" />,
      desc: 'Run AI review with Muse Spark to receive suggestions for numbers, dates, statutory legal terms, and disfluencies. Hallucinated flags are automatically discarded if evidence is not quoted verbatim. Reviewers play the exact audio passage, edit text with a mandatory reason, resolve flags (accept, edit, dismiss, retain), assign locked taxonomy roles (Magistrate, Prosecutor, Advocate, etc.), and inspect the complete audit trail.',
    },
    {
      num: '4',
      title: 'Download Watermarked Document Draft',
      icon: <Download className="w-5 h-5 text-[#0B3D2C]" />,
      desc: 'Generate an official DOCX draft containing diagonal "DRAFT - NOT CERTIFIED" watermarks, header banners, the verbatim transcript, the complete human corrections log, unresolved issues, Appendix D bilingual orientation summaries (English and Kiswahili), and Appendix E accuracy metrics (WER/CER).',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Back button */}
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-[#C9A86A] text-[#0B3D2C] hover:bg-[#FAF7F0] rounded-lg text-sm font-bold transition-colors shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to workflow</span>
        </button>
      </div>

      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl md:text-4xl font-extrabold text-[#0B3D2C]">How It Works</h1>
        <p className="text-base text-[#57534E] max-w-xl mx-auto">
          HakiScribe turns a hearing recording into a draft transcript that a human reviews, corrects, and owns. Four guarded steps with full audit accountability throughout.
        </p>
      </div>

      {/* Step Cards */}
      <div className="space-y-4">
        {steps.map((step) => (
          <div key={step.num} className="hakiscribe-card p-5 flex flex-col sm:flex-row items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#FAF7F0] border border-[#C9A86A] flex items-center justify-center shrink-0 font-bold text-[#0B3D2C]">
              {step.icon}
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[#C9A86A] uppercase tracking-wider">
                  Step {step.num}
                </span>
                <h3 className="text-base font-bold text-[#0B3D2C]">{step.title}</h3>
              </div>
              <p className="text-[#1F2A24] leading-relaxed text-sm pt-1">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Draft Safeguard */}
      <div className="p-4 bg-[#FAF7F0] border border-[#C9A86A] rounded-xl text-xs space-y-2 text-[#0B3D2C]">
        <div className="flex items-center gap-2 font-bold text-sm">
          <ShieldCheck className="w-4 h-4 text-[#C9A86A]" />
          <span>Judicial Independence &amp; Draft Safeguard</span>
        </div>
        <p className="text-[#1F2A24] leading-relaxed">
          Technology must support judicial officers, not replace them. HakiScribe strictly generates drafts for review by authorized court personnel. Every export explicitly disclaims certification, ensuring official judicial authority and independence remain inviolable.
        </p>
      </div>

      <div className="text-center pt-2">
        <button
          onClick={onBack}
          className="px-6 py-2.5 bg-[#0B3D2C] text-[#FAF7F0] hover:bg-[#082E21] font-bold text-sm rounded-lg transition-colors shadow-xs"
        >
          Return to Transcript Workflow
        </button>
      </div>
    </div>
  );
};
