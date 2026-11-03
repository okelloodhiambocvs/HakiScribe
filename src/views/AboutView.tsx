import React from 'react';
import { ArrowLeft, CheckCircle2, Shield, Scale, Clock, Users, BookOpen } from 'lucide-react';

interface AboutViewProps {
  onBack: () => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ onBack }) => {
  const problemCards = [
    {
      label: 'DELAYS',
      title: 'Manual Transcription Backlog',
      text: 'Manual documentation slows the preparation of proceedings. A single hearing costs 4–6 hours of manual transcription before the record even exists.',
      bgClass: 'bg-[#0B3D2C] text-white',
      labelClass: 'bg-[#C9A86A] text-[#0B3D2C]',
    },
    {
      label: 'APPEALS',
      title: 'Timely Justice for Litigants',
      text: 'Appellants wait months for records to lodge appeals. For short custodial sentences, that wait can shrink what a successful appeal is worth.',
      bgClass: 'bg-[#FAF7F0] border border-[#C9A86A] text-[#1F2A24]',
      labelClass: 'bg-[#C9A86A] text-[#0B3D2C]',
    },
    {
      label: 'WORKLOAD',
      title: 'Court Registry Strain',
      text: 'Across 360+ Kenyan courts, judicial officers and court staff balance recording hearings, preparing judgments, and answering repeated document requests.',
      bgClass: 'bg-[#FAF7F0] border border-[#E8D9B8] text-[#1F2A24]',
      labelClass: 'bg-[#E8D9B8] text-[#1F2A24]',
    },
    {
      label: 'TRUST',
      title: 'Preserving Judicial Integrity',
      text: 'Records must stay accurate, confidential, and auditable. AI outputs must never be accepted blindly or masquerade as official certifications.',
      bgClass: 'bg-[#1F2A24] text-[#FAF7F0]',
      labelClass: 'bg-[#FAF7F0] text-[#1F2A24]',
    },
  ];

  const affectedGroups = [
    'Litigants & Families',
    'Appellants in Custody',
    'Advocates & Defense Counsel',
    'Magistrates & Judges',
    'Court Registry Clerks',
    'Kenya Prison Service',
  ];

  const solutions = [
    {
      num: 1,
      title: 'Upload and Validate',
      desc: 'Enforces synthetic attestation, file type validation, and SHA-256 integrity fingerprinting with privacy safeguards.',
    },
    {
      num: 2,
      title: 'Batch Diarization',
      desc: 'Transcribes English, Kiswahili, and code-switched speech verbatim into speaker turns with accurate timestamps.',
    },
    {
      num: 3,
      title: 'Guarded AI Review',
      desc: 'Suggests flags for numbers, legal sections, and ambiguous passages; drops hallucinated flags if evidence is not quoted.',
    },
    {
      num: 4,
      title: 'Human Review Desk',
      desc: 'Two-pane interface with jump-to-audio, unified diffs, mandatory edit reasons, taxonomy role assignment, and full history.',
    },
    {
      num: 5,
      title: 'Watermarked Draft Export',
      desc: 'Generates watermarked Word documents (.docx) with correction audit logs, unresolved issues, and plain-language summaries.',
    },
    {
      num: 6,
      title: 'Measured Accuracy (ASR)',
      desc: 'Objective WER and CER evaluation calculated with standard normalisation across English, Kiswahili, and mixed speech.',
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

      {/* Hero Header */}
      <div className="text-center space-y-3 pt-2">
        <h1 className="text-3xl md:text-5xl font-extrabold text-[#0B3D2C] tracking-tight">
          Karibu HakiScribe
        </h1>
        <p className="text-sm font-semibold text-[#C9A86A] uppercase tracking-widest">
          "Haki" means justice in Kiswahili.
        </p>
        <p className="text-base md:text-lg text-[#1F2A24] max-w-2xl mx-auto leading-relaxed font-medium">
          HakiScribe is a prototype review desk that turns a hearing recording into a draft transcript which a person reviews and corrects, with every change recorded. Its purpose is to reduce avoidable delay in preparing accurate court records.
        </p>
      </div>

      {/* Problem Section */}
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#0B3D2C]">The Problem</h2>
          <p className="text-sm text-[#57534E] max-w-xl mx-auto mt-1">
            Justice delayed is justice denied — and in Kenyan courts, delay often starts with the transcript.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {problemCards.map((card, i) => (
            <div key={i} className={`p-5 rounded-2xl shadow-sm ${card.bgClass} flex flex-col justify-between`}>
              <div>
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-extrabold tracking-wider uppercase mb-3 ${card.labelClass}`}>
                  {card.label}
                </span>
                <h3 className="text-lg font-bold mb-2">{card.title}</h3>
                <p className="text-xs leading-relaxed opacity-90">{card.text}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Who is affected */}
        <div className="pt-2 text-center">
          <span className="text-xs font-bold text-[#0B3D2C] uppercase tracking-wider block mb-2">
            Who is affected across Kenya's legal system
          </span>
          <div className="flex flex-wrap justify-center gap-2">
            {affectedGroups.map((group, i) => (
              <span
                key={i}
                className="px-3 py-1 bg-[#FAF7F0] border border-[#C9A86A] text-[#1F2A24] text-xs font-semibold rounded-full shadow-2xs"
              >
                {group}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Approach Safeguards */}
      <div className="hakiscribe-card space-y-4 bg-white">
        <h2 className="text-xl font-bold text-[#0B3D2C] border-b border-[#E8D9B8] pb-2">
          Our Core Rule: AI Proposes, Human Reviews
        </h2>
        <ul className="space-y-3 text-sm text-[#1F2A24]">
          <li className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#137333] shrink-0 mt-0.5" />
            <span>
              <strong>AI proposes a draft transcript; a human reviews and owns every word.</strong> Judicial officers and clerks maintain full control over the proceedings.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#137333] shrink-0 mt-0.5" />
            <span>
              <strong>Every edit is traceable:</strong> Who edited what, when, what the before/after text was, and a mandatory reason for the change.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#137333] shrink-0 mt-0.5" />
            <span>
              <strong>Preserves code-switching verbatim:</strong> English and Kiswahili phrases are transcribed exactly as spoken. The model never paraphrases, translates, or invents text.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#137333] shrink-0 mt-0.5" />
            <span>
              <strong>Drafts only:</strong> Exports carry explicit watermarks and disclaimers. The tool never issues certified or official court records.
            </span>
          </li>
        </ul>
      </div>

      {/* The 6 Capabilities */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-[#0B3D2C] text-center">
          Six Built Capabilities
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {solutions.map((item) => (
            <div key={item.num} className="p-4 bg-white rounded-xl border border-[#E8D9B8] border-t-3 border-t-[#C9A86A] shadow-xs space-y-1.5">
              <span className="w-6 h-6 rounded-full bg-[#C9A86A] text-[#0B3D2C] font-bold text-xs flex items-center justify-center">
                {item.num}
              </span>
              <h4 className="font-bold text-sm text-[#0B3D2C]">{item.title}</h4>
              <p className="text-xs text-[#57534E] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Language Notes */}
      <div className="p-5 bg-[#FAF7F0] border border-[#C9A86A] rounded-2xl text-xs space-y-2 text-[#1F2A24]">
        <h3 className="font-bold text-sm text-[#0B3D2C] flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-[#C9A86A]" />
          <span>Kenyan Language Support &amp; Limitations</span>
        </h3>
        <p>
          Kenyan court proceedings fluidly blend English legal terminology (e.g., <em>"contrary to Section 268 of the Penal Code"</em>), Kiswahili judicial honorifics (<em>"Mheshimiwa"</em>, <em>"mshtakiwa"</em>, <em>"dhamana"</em>), and code-switching. HakiScribe's ASR pipeline preserves these verbatim without unauthorized translation. Accuracy is measured across standard reference scripts and reported transparently.
        </p>
      </div>

      {/* Footer Banner */}
      <div className="bg-[#082E21] text-[#FAF7F0] p-6 rounded-2xl text-center space-y-3">
        <h3 className="text-lg font-bold text-[#C9A86A]">Clarity in Every Proceeding</h3>
        <p className="text-xs text-[#E8D9B8] max-w-lg mx-auto">
          Built for the Meta Global Hackathon using Muse Voice Transcribe, Muse Spark, and Muse Wonder models.
        </p>
        <button
          onClick={onBack}
          className="px-6 py-2 bg-[#C9A86A] text-[#0B3D2C] hover:bg-[#B39356] font-bold text-xs rounded-lg transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
};
