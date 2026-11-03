import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  Header,
  Footer,
} from 'docx';
import { Correction, Flag, Recording, Segment } from '../types';
import { calculateMetrics } from './evaluation';

export async function generateDocxBlob({
  recording,
  segments,
  flags,
  corrections,
  reviewer,
}: {
  recording: Recording;
  segments: Segment[];
  flags: Flag[];
  corrections: Correction[];
  reviewer: string;
}): Promise<{ blob: Blob; filename: string }> {
  const unresolvedFlags = flags.filter((f) => f.status === 'OPEN' || f.status === 'RETAINED');
  const metrics = calculateMetrics(segments, corrections, flags);
  const now = new Date();
  const dateFormatted = now.toISOString().slice(0, 10);
  const timestampStr = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const filename = `HakiScribe_Draft_${recording.filename.replace(/\.[^/.]+$/, '')}_${timestampStr}.docx`;

  const borderNone = {
    top: { style: BorderStyle.SINGLE, size: 1, color: 'D0D7DE' },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D0D7DE' },
    left: { style: BorderStyle.SINGLE, size: 1, color: 'D0D7DE' },
    right: { style: BorderStyle.SINGLE, size: 1, color: 'D0D7DE' },
  };

  // Header & Footer
  const header = new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: 'DRAFT — NOT A CERTIFIED RECORD [WATERMARK: DRAFT - NOT CERTIFIED]',
            bold: true,
            color: 'B91C1C',
            size: 20,
          }),
        ],
      }),
    ],
  });

  const footer = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: 'Draft prepared with AI assistance for review by authorised court staff. Not a certified record.',
            italics: true,
            color: '57534E',
            size: 16,
          }),
        ],
      }),
    ],
  });

  // Transcript table rows
  const transcriptRows = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: 1800, type: WidthType.DXA },
          borders: borderNone,
          children: [new Paragraph({ children: [new TextRun({ text: 'Time', bold: true })] })],
        }),
        new TableCell({
          width: { size: 2400, type: WidthType.DXA },
          borders: borderNone,
          children: [new Paragraph({ children: [new TextRun({ text: 'Speaker / Role', bold: true })] })],
        }),
        new TableCell({
          width: { size: 5400, type: WidthType.DXA },
          borders: borderNone,
          children: [new Paragraph({ children: [new TextRun({ text: 'Verbatim Transcript Text', bold: true })] })],
        }),
      ],
    }),
    ...segments.map((s) => {
      const isEdited = s.text_current !== s.text_original;
      return new TableRow({
        children: [
          new TableCell({
            width: { size: 1800, type: WidthType.DXA },
            borders: borderNone,
            children: [
              new Paragraph({
                children: [new TextRun({ text: `${s.start_sec.toFixed(1)}s – ${s.end_sec.toFixed(1)}s`, size: 18 })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 2400, type: WidthType.DXA },
            borders: borderNone,
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: s.speaker, bold: true, color: '0B3D2C', size: 18 }),
                  s.speaker !== s.speaker_label
                    ? new TextRun({ text: ` (${s.speaker_label})`, color: '78716C', size: 16 })
                    : new TextRun({ text: '' }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 5400, type: WidthType.DXA },
            borders: borderNone,
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: s.text_current, size: 20 }),
                  isEdited ? new TextRun({ text: ' [Reviewed/Edited]', italics: true, color: 'B45309', size: 16 }) : new TextRun({ text: '' }),
                ],
              }),
            ],
          }),
        ],
      });
    }),
  ];

  // Corrections table rows
  const correctionRows = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({ width: { size: 2000, type: WidthType.DXA }, borders: borderNone, children: [new Paragraph({ children: [new TextRun({ text: 'Timestamp', bold: true })] })] }),
        new TableCell({ width: { size: 1800, type: WidthType.DXA }, borders: borderNone, children: [new Paragraph({ children: [new TextRun({ text: 'Reviewer', bold: true })] })] }),
        new TableCell({ width: { size: 1200, type: WidthType.DXA }, borders: borderNone, children: [new Paragraph({ children: [new TextRun({ text: 'Segment', bold: true })] })] }),
        new TableCell({ width: { size: 2300, type: WidthType.DXA }, borders: borderNone, children: [new Paragraph({ children: [new TextRun({ text: 'Original AI Text', bold: true })] })] }),
        new TableCell({ width: { size: 2300, type: WidthType.DXA }, borders: borderNone, children: [new Paragraph({ children: [new TextRun({ text: 'Corrected Text', bold: true })] })] }),
      ],
    }),
    ...(corrections.length > 0
      ? corrections.map((c) => {
          const seg = segments.find((s) => s.id === c.segment_id);
          return new TableRow({
            children: [
              new TableCell({ width: { size: 2000, type: WidthType.DXA }, borders: borderNone, children: [new Paragraph({ children: [new TextRun({ text: c.created_at.slice(0, 19).replace('T', ' '), size: 16 })] })] }),
              new TableCell({ width: { size: 1800, type: WidthType.DXA }, borders: borderNone, children: [new Paragraph({ children: [new TextRun({ text: c.reviewer_name, size: 16 })] })] }),
              new TableCell({ width: { size: 1200, type: WidthType.DXA }, borders: borderNone, children: [new Paragraph({ children: [new TextRun({ text: `Seg #${seg ? seg.idx : c.segment_id}`, size: 16 })] })] }),
              new TableCell({ width: { size: 2300, type: WidthType.DXA }, borders: borderNone, children: [new Paragraph({ children: [new TextRun({ text: c.before_text, size: 16, color: '7C2D12' })] })] }),
              new TableCell({ width: { size: 2300, type: WidthType.DXA }, borders: borderNone, children: [new Paragraph({ children: [new TextRun({ text: `${c.after_text} (Reason: ${c.reason})`, size: 16, color: '0B3D2C' })] })] }),
            ],
          });
        })
      : [
          new TableRow({
            children: [
              new TableCell({
                columnSpan: 5,
                borders: borderNone,
                children: [new Paragraph({ children: [new TextRun({ text: 'No human edits recorded. All segments reflect original AI transcription.', italics: true })] })],
              }),
            ],
          }),
        ]),
  ];

  // Unresolved Flags rows
  const unresolvedRows = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({ width: { size: 1200, type: WidthType.DXA }, borders: borderNone, children: [new Paragraph({ children: [new TextRun({ text: 'Seg #', bold: true })] })] }),
        new TableCell({ width: { size: 2000, type: WidthType.DXA }, borders: borderNone, children: [new Paragraph({ children: [new TextRun({ text: 'Type', bold: true })] })] }),
        new TableCell({ width: { size: 1400, type: WidthType.DXA }, borders: borderNone, children: [new Paragraph({ children: [new TextRun({ text: 'Severity', bold: true })] })] }),
        new TableCell({ width: { size: 5000, type: WidthType.DXA }, borders: borderNone, children: [new Paragraph({ children: [new TextRun({ text: 'Quote & Message', bold: true })] })] }),
      ],
    }),
    ...(unresolvedFlags.length > 0
      ? unresolvedFlags.map((f) => {
          return new TableRow({
            children: [
              new TableCell({ width: { size: 1200, type: WidthType.DXA }, borders: borderNone, children: [new Paragraph({ children: [new TextRun({ text: `Seg ${f.segment_idx}`, size: 16 })] })] }),
              new TableCell({ width: { size: 2000, type: WidthType.DXA }, borders: borderNone, children: [new Paragraph({ children: [new TextRun({ text: f.flag_type, size: 16, bold: true })] })] }),
              new TableCell({ width: { size: 1400, type: WidthType.DXA }, borders: borderNone, children: [new Paragraph({ children: [new TextRun({ text: f.severity, size: 16, color: f.severity === 'HIGH' ? 'B91C1C' : 'B45309' })] })] }),
              new TableCell({ width: { size: 5000, type: WidthType.DXA }, borders: borderNone, children: [new Paragraph({ children: [new TextRun({ text: `"${f.evidence}": ${f.message}`, size: 16 })] })] }),
            ],
          });
        })
      : [
          new TableRow({
            children: [
              new TableCell({
                columnSpan: 4,
                borders: borderNone,
                children: [new Paragraph({ children: [new TextRun({ text: 'All AI review flags have been reviewed and resolved.', italics: true })] })],
              }),
            ],
          }),
        ]),
  ];

  const doc = new Document({
    sections: [
      {
        headers: { default: header },
        footers: { default: footer },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'HAKISCRIBE-AI PROCEEDING TRANSCRIPT (DRAFT)',
                bold: true,
                size: 32,
                color: '0B3D2C',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'REPUBLIC OF KENYA — JUDICIAL PROCEEDING RECORD (PROTOTYPE)',
                size: 20,
                color: 'C9A86A',
                bold: true,
              }),
            ],
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Recording File: ', bold: true }),
              new TextRun({ text: `${recording.filename} ` }),
              new TextRun({ text: `(SHA256: ${recording.sha256.slice(0, 16)}...)`, color: '78716C' }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Reviewer Name: ', bold: true }),
              new TextRun({ text: `${reviewer}    ` }),
              new TextRun({ text: 'Export Date: ', bold: true }),
              new TextRun({ text: dateFormatted }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Synthetic Demo Notice: Synthetic demo content only. This draft was produced from a synthetic demonstration recording with no real litigants. It is not a certified record.',
                italics: true,
                color: '7C2D12',
                size: 18,
              }),
            ],
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({ text: '1. VERBATIM TRANSCRIPT', bold: true, size: 24, color: '0B3D2C' }),
            ],
          }),
          new Table({
            width: { size: 9600, type: WidthType.DXA },
            rows: transcriptRows,
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({ text: '2. HUMAN CORRECTIONS AUDIT LOG', bold: true, size: 24, color: '0B3D2C' }),
            ],
          }),
          new Table({
            width: { size: 9600, type: WidthType.DXA },
            rows: correctionRows,
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({ text: '3. UNRESOLVED REVIEW FLAGS', bold: true, size: 24, color: '0B3D2C' }),
            ],
          }),
          new Table({
            width: { size: 9600, type: WidthType.DXA },
            rows: unresolvedRows,
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({ text: 'APPENDIX D — PLAIN-LANGUAGE SUMMARY', bold: true, size: 24, color: '0B3D2C' }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'English Orientation (Not legal advice. This summary is an AI-generated orientation draft only; it is not the record. Ask the court clerk or a lawyer about your case.):',
                bold: true,
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'The court heard criminal case CR 123 of 2026 where the accused denied the theft charge under Penal Code Section 268. The defence applied for bail while the prosecution opposed. The court ordered mention on 20 November 2026 with bail ruling scheduled for 27 November 2026.',
                size: 20,
              }),
            ],
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Uelewa kwa Kiswahili (Hii si ushauri wa kisheria. Muhtasari huu ni rasimu ya AI kwa uelewa tu; si rekodi. Uliza karani wa mahakama au wakili kuhusu kesi yako.):',
                bold: true,
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Mahakama ilisikiliza kesi ya jinai CR 123 ya 2026 ambapo mshtakiwa alikana shtaka la wizi chini ya Kifungu 268 cha Kanuni ya Adhabu. Upande wa utetezi uliomba dhamana huku upande wa mashtaka ukipinga. Mahakama ilipanga kutajwa tena tarehe 20 Novemba 2026 na uamuzi wa dhamana tarehe 27 Novemba 2026.',
                size: 20,
              }),
            ],
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({ text: 'APPENDIX E — ACCURACY & AUDIT METRICS', bold: true, size: 24, color: '0B3D2C' }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `• Human Changes: WER=${metrics.ai_vs_reviewed.values.wer ?? 0}, CER=${metrics.ai_vs_reviewed.values.cer ?? 0}, Changed=${metrics.ai_vs_reviewed.values.changed_pct ?? 0}% (n=${metrics.ai_vs_reviewed.sample_size})\n` +
                  `• Reference Accuracy: WER=${metrics.reference.values.wer ?? 0}, CER=${metrics.reference.values.cer ?? 0} (n=${metrics.reference.sample_size})\n` +
                  `• Speaker Attribution: Attribution=${metrics.speaker.values.attribution_pct ?? 0}%, Boundary Error=${metrics.speaker.values.boundary_error_ms ?? 0}ms\n` +
                  `• Traceability Completeness: ${metrics.traceability.values.completeness_pct ?? 100}% of corrections fully audited\n` +
                  `• Active Review Time: ${metrics.review_time.values.elapsed_seconds ?? 0}s`,
                size: 18,
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  return { blob, filename };
}
