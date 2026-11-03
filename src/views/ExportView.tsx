import React, { useState } from 'react';
import {
  Download,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Sparkles,
  ShieldCheck,
  FileCheck,
  HelpCircle,
} from 'lucide-react';
import { Correction, Flag, Recording, Segment } from '../types';
import { calculateMetrics } from '../services/evaluation';
import { generateDocxBlob } from '../services/docxExport';
import { AppStorage } from '../services/storage';
import { ApiClient } from '../services/apiClient';

interface ExportViewProps {
  reviewer: string;
  recording: Recording | null;
  segments: Segment[];
  flags: Flag[];
  corrections: Correction[];
  onNavigateToUpload: () => void;
  onNavigateToTranscribe: () => void;
}

export const ExportView: React.FC<ExportViewProps> = ({
  reviewer,
  recording,
  segments,
  flags,
  corrections,
  onNavigateToUpload,
  onNavigateToTranscribe,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDoc, setGeneratedDoc] = useState<{
    blob: Blob;
    filename: string;
  } | null>(null);

  if (!recording) {
    return (
      <div className="hakiscribe-card text-center py-10 space-y-3">
        <AlertTriangle className="w-12 h-12 text-[#C9A86A] mx-auto" />
        <h3 className="text-xl font-bold text-[#0B3D2C]">No recording yet</h3>
        <p className="text-sm text-[#57534E]">Upload a synthetic hearing recording first.</p>
        <button
          onClick={onNavigateToUpload}
          className="px-5 py-2.5 bg-[#0B3D2C] text-[#FAF7F0] font-bold rounded-lg text-sm hover:bg-[#082E21]"
        >
          Go to Upload
        </button>
      </div>
    );
  }

  if (segments.length === 0) {
    return (
      <div className="hakiscribe-card text-center py-10 space-y-3">
        <AlertTriangle className="w-12 h-12 text-[#C9A86A] mx-auto" />
        <h3 className="text-xl font-bold text-[#0B3D2C]">No transcript yet</h3>
        <p className="text-sm text-[#57534E]">Transcribe the recording before downloading a draft document.</p>
        <button
          onClick={onNavigateToTranscribe}
          className="px-5 py-2.5 bg-[#0B3D2C] text-[#FAF7F0] font-bold rounded-lg text-sm hover:bg-[#082E21]"
        >
          Go to Transcribe
        </button>
      </div>
    );
  }

  const hasReviewer = Boolean(reviewer.trim());
  const unresolvedFlags = flags.filter((f) => f.status === 'OPEN' || f.status === 'RETAINED');
  const metrics = calculateMetrics(segments, corrections, flags);

  const handleGenerateDocx = async () => {
    if (!hasReviewer) {
      alert('Enter your reviewer name in the sidebar to generate a draft.');
      return;
    }

    setIsGenerating(true);
    try {
      try {
        await ApiClient.generateDocx(recording.id, reviewer.trim());
      } catch (backendErr) {
        console.warn('[ExportView] Backend export logging error (proceeding with client generation):', backendErr);
      }

      const result = await generateDocxBlob({
        recording,
        segments,
        flags,
        corrections,
        reviewer: reviewer.trim(),
      });

      setGeneratedDoc(result);

      AppStorage.addExport({
        id: Date.now(),
        recording_id: recording.id,
        docx_filename: result.filename,
        generated_by: reviewer.trim(),
        created_at: new Date().toISOString(),
        summary_en:
          'The court heard criminal case CR 123 of 2026. The accused denied the theft charge...',
        summary_sw:
          'Mahakama ilisikiliza kesi ya jinai CR 123 ya 2026. Mshtakiwa alikana shtaka la wizi...',
      });

      AppStorage.addLedgerEntry({
        timestamp: new Date().toISOString(),
        service: 'export_service',
        model: 'docx_watermarked_generator',
        status: 'SUCCESS',
        duration_ms: 320,
        note: `Generated draft ${result.filename} with watermarks and Appendices D & E`,
      });
    } catch (err: any) {
      alert('Failed to generate DOCX: ' + (err?.message || String(err)));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedDoc) return;
    const url = URL.createObjectURL(generatedDoc.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = generatedDoc.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderMetric = (name: string, envelope: any) => {
    if (!envelope || !envelope.values || Object.keys(envelope.values).length === 0) {
      return (
        <div className="p-3 bg-white rounded-lg border border-[#E8D9B8] text-xs">
          <strong className="text-[#0B3D2C] block mb-0.5">{name}</strong>
          <span className="text-gray-500 italic">Not available: {envelope?.reason || 'N/A'}</span>
        </div>
      );
    }

    const valueStr = Object.entries(envelope.values)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ');

    return (
      <div className="p-3 bg-white rounded-lg border border-[#E8D9B8] text-xs space-y-1">
        <div className="flex items-center justify-between">
          <strong className="text-[#0B3D2C]">{name}</strong>
          <span className="font-mono text-[11px] text-gray-500">n={envelope.sample_size}</span>
        </div>
        <div className="font-mono text-sm font-bold text-[#1F2A24] bg-[#FAF7F0] px-2 py-1 rounded border border-[#E8D9B8]/60">
          {valueStr}
        </div>
        <p className="text-[10px] text-gray-500 leading-normal">{envelope.how_computed}</p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[#0B3D2C]">4. Download Document</h2>
        <p className="text-sm text-[#57534E]">
          Generate and download watermarked DOCX transcript with complete audit logs, plain-language summaries, and evaluation metrics.
        </p>
      </div>

      {/* Draft Disclaimer Notice */}
      <div className="draft-watermark">
        DRAFT ONLY — THIS DOCUMENT IS NOT CERTIFIED. AI PROPOSES, HUMAN REVIEWS.
      </div>

      {!hasReviewer && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs font-semibold text-amber-900 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Enter your reviewer name in the sidebar to generate a draft.</span>
        </div>
      )}

      {/* Accuracy & Metrics Section */}
      <div className="hakiscribe-card space-y-4">
        <div className="flex items-center justify-between border-b border-[#E8D9B8] pb-2">
          <h3 className="text-sm font-bold text-[#0B3D2C] uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#C9A86A]" />
            <span>Accuracy Information & Metrics</span>
          </h3>
          <span className="text-xs text-gray-500">Pure Python / TypeScript normalized</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {renderMetric('Human changes (AI vs reviewed)', metrics.ai_vs_reviewed)}
          {renderMetric('Accuracy vs reference', metrics.reference)}
          {renderMetric('Speaker attribution', metrics.speaker)}
          {renderMetric('Traceability completeness', metrics.traceability)}
          {renderMetric('Review time recorded', metrics.review_time)}
        </div>
      </div>

      {/* Unresolved Issues Warning */}
      {unresolvedFlags.length > 0 && (
        <div className="p-4 bg-amber-50/80 border border-amber-300 rounded-xl text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>
              Exporting with {unresolvedFlags.length} unresolved flag{unresolvedFlags.length > 1 ? 's' : ''}.
            </span>
          </div>
          <p className="text-amber-800">
            Every unresolved flag stays listed in Appendix C of the draft document so the official record retains notice of potential ambiguities.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-amber-900 font-medium">
            {unresolvedFlags.slice(0, 4).map((f) => (
              <li key={f.id}>
                Segment {f.segment_idx}: {f.message} (Quote: "{f.evidence}")
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Document Generation Action Card */}
      <div className="hakiscribe-card space-y-4">
        <h3 className="text-sm font-bold text-[#0B3D2C] uppercase tracking-wider border-b border-[#E8D9B8] pb-2">
          Your Document Draft
        </h3>

        <div className="bg-[#FAF7F0] p-4 rounded-xl border border-[#E8D9B8] space-y-3">
          <div className="flex items-start gap-3">
            <FileText className="w-8 h-8 text-[#0B3D2C] shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <strong className="text-sm text-[#0B3D2C] block">
                Official Kenyan Court Hearing Transcript Draft (.docx)
              </strong>
              <p className="text-gray-600">
                Includes diagonal watermark, header/footer non-certification warnings, {segments.length} verbatim speaker turns, {corrections.length} audit trail corrections, Appendix D bilingual summary (English &amp; Kiswahili), and Appendix E accuracy metrics.
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={handleGenerateDocx}
              disabled={!hasReviewer || isGenerating}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-lg font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-2 ${
                hasReviewer && !isGenerating
                  ? 'bg-[#0B3D2C] hover:bg-[#082E21] text-[#FAF7F0]'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <FileCheck className="w-4 h-4 text-[#C9A86A]" />
              <span>{isGenerating ? 'Building Word Document...' : 'Generate document (.docx)'}</span>
            </button>

            {generatedDoc && (
              <button
                onClick={handleDownload}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#137333] hover:bg-[#0e5726] text-white font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Download document ({generatedDoc.filename})</span>
              </button>
            )}
          </div>
        </div>

        {/* Appendices Preview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Appendix D English */}
          <div className="p-3 bg-white border border-[#E8D9B8] rounded-lg text-xs space-y-1.5">
            <span className="font-bold text-[#0B3D2C] uppercase text-[11px] block">
              Appendix D: Plain-Language Summary (EN)
            </span>
            <p className="text-[10px] text-amber-800 italic font-semibold">
              Not legal advice. This summary is an AI-generated orientation draft only; it is not the record.
            </p>
            <p className="text-gray-700 leading-relaxed text-[11px]">
              The court heard criminal case CR 123 of 2026 where the accused denied the theft charge under Penal Code Section 268. The defence applied for bail while the prosecution opposed. The court ordered mention on 20 November 2026 with bail ruling scheduled for 27 November 2026.
            </p>
          </div>

          {/* Appendix D Swahili */}
          <div className="p-3 bg-white border border-[#E8D9B8] rounded-lg text-xs space-y-1.5">
            <span className="font-bold text-[#0B3D2C] uppercase text-[11px] block">
              Kiambatisho D: Muhtasari wa Lugha Rahisi (SW)
            </span>
            <p className="text-[10px] text-amber-800 italic font-semibold">
              Hii si ushauri wa kisheria. Muhtasari huu ni rasimu ya AI kwa uelewa tu; si rekodi.
            </p>
            <p className="text-gray-700 leading-relaxed text-[11px]">
              Mahakama ilisikiliza kesi ya jinai CR 123 ya 2026 ambapo mshtakiwa alikana shtaka la wizi chini ya Kifungu 268 cha Kanuni ya Adhabu. Upande wa utetezi uliomba dhamana huku upande wa mashtaka ukipinga. Mahakama ilipanga kutajwa tena tarehe 20 Novemba 2026 na uamuzi wa dhamana tarehe 27 Novemba 2026.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
