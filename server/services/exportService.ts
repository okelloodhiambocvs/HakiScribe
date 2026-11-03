import fs from 'fs';
import path from 'path';
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
import { ExportDocument } from '../../shared/types';
import { SessionRepo } from '../db/repositories/sessionRepo';
import { SegmentRepo } from '../db/repositories/segmentRepo';
import { FlagRepo } from '../db/repositories/flagRepo';
import { CorrectionRepo } from '../db/repositories/correctionRepo';
import { ExportRepo } from '../db/repositories/exportRepo';
import { AuditRepo } from '../db/repositories/auditRepo';
import { EvaluationService } from './evaluationService';
import { generateWonderSummary } from '../integrations/meta/wonderSummary';

export class ExportService {
  private static exportDir = path.resolve(process.cwd(), 'storage/exports');

  public static ensureExportDir(): void {
    if (!fs.existsSync(this.exportDir)) {
      fs.mkdirSync(this.exportDir, { recursive: true });
    }
  }

  public static async generateDraftDocx(
    recordingId: number,
    reviewer: string
  ): Promise<{ exportDoc: ExportDocument; filePath: string }> {
    this.ensureExportDir();

    if (!reviewer || !reviewer.trim()) {
      throw new Error('Reviewer name is required to generate a draft export.');
    }

    const session = SessionRepo.getById(recordingId);
    if (!session) {
      throw new Error(`Recording session #${recordingId} not found.`);
    }

    const segments = SegmentRepo.getByRecordingId(recordingId);
    if (segments.length === 0) {
      throw new Error(`Cannot export draft: Recording #${recordingId} has no transcript segments.`);
    }

    const flags = FlagRepo.getByRecordingId(recordingId);
    const corrections = CorrectionRepo.getByRecordingId(recordingId);
    const unresolvedFlags = flags.filter((f) => f.status === 'OPEN' || f.status === 'RETAINED');
    const metrics = EvaluationService.evaluateSession(segments, corrections);

    // Generate plain-language summary for Appendix D
    const wonderSummary = await generateWonderSummary(segments);

    const now = new Date();
    const dateFormatted = now.toISOString().slice(0, 10);
    const timestampStr = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const filename = `HakiScribe_Draft_${session.filename.replace(/\.[^/.]+$/, '')}_${timestampStr}.docx`;
    const targetPath = path.join(this.exportDir, filename);

    const borderNone = {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'D0D7DE' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D0D7DE' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'D0D7DE' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'D0D7DE' },
    };

    const doc = new Document({
      sections: [
        {
          headers: {
            default: new Header({
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
            }),
          },
          footers: {
            default: new Footer({
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
            }),
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: 'HAKISCRIBE-AI PROCEEDING TRANSCRIPT (DRAFT)',
                  bold: true,
                  size: 30,
                  color: '0B3D2C',
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: 'REPUBLIC OF KENYA — JUDICIAL PROCEEDING RECORD (PROTOTYPE DRAFT)',
                  size: 18,
                  color: 'C9A86A',
                  bold: true,
                }),
              ],
            }),
            new Paragraph({ text: '' }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Recording File: ', bold: true }),
                new TextRun({ text: `${session.filename} ` }),
                new TextRun({ text: `(SHA256: ${session.sha256.slice(0, 16)}...)`, color: '78716C' }),
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
                  text: 'Synthetic Demo Notice: Synthetic demonstration content only. Fictional proceedings with no real litigants. Not an official court record.',
                  italics: true,
                  color: '7C2D12',
                  size: 18,
                }),
              ],
            }),
            new Paragraph({ text: '' }),
            new Paragraph({
              children: [
                new TextRun({ text: '1. VERBATIM TRANSCRIPT', bold: true, size: 22, color: '0B3D2C' }),
              ],
            }),
            new Table({
              width: { size: 9600, type: WidthType.DXA },
              rows: [
                new TableRow({
                  tableHeader: true,
                  children: [
                    new TableCell({ width: { size: 1800, type: WidthType.DXA }, borders: borderNone, children: [new Paragraph({ children: [new TextRun({ text: 'Time', bold: true })] })] }),
                    new TableCell({ width: { size: 2400, type: WidthType.DXA }, borders: borderNone, children: [new Paragraph({ children: [new TextRun({ text: 'Speaker / Role', bold: true })] })] }),
                    new TableCell({ width: { size: 5400, type: WidthType.DXA }, borders: borderNone, children: [new Paragraph({ children: [new TextRun({ text: 'Verbatim Transcript Text', bold: true })] })] }),
                  ],
                }),
                ...segments.map((s) => {
                  const isEdited = s.text_current !== s.text_original;
                  return new TableRow({
                    children: [
                      new TableCell({ width: { size: 1800, type: WidthType.DXA }, borders: borderNone, children: [new Paragraph({ children: [new TextRun({ text: `${s.start_sec.toFixed(1)}s – ${s.end_sec.toFixed(1)}s`, size: 18 })] })] }),
                      new TableCell({ width: { size: 2400, type: WidthType.DXA }, borders: borderNone, children: [new Paragraph({ children: [new TextRun({ text: s.speaker, bold: true, color: '0B3D2C', size: 18 })] })] }),
                      new TableCell({ width: { size: 5400, type: WidthType.DXA }, borders: borderNone, children: [new Paragraph({ children: [new TextRun({ text: s.text_current, size: 18 }), isEdited ? new TextRun({ text: ' [Reviewed/Edited]', italics: true, color: 'B45309', size: 16 }) : new TextRun({ text: '' })] })] }),
                    ],
                  });
                }),
              ],
            }),
            new Paragraph({ text: '' }),
            new Paragraph({
              children: [
                new TextRun({ text: 'APPENDIX D — PLAIN-LANGUAGE SUMMARY', bold: true, size: 22, color: '0B3D2C' }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'English Orientation (Not legal advice. AI-generated orientation draft only; it is not the record.):\n', bold: true }),
                new TextRun({ text: wonderSummary.summaryEn }),
              ],
            }),
            new Paragraph({ text: '' }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Uelewa kwa Kiswahili (Hii si ushauri wa kisheria. Muhtasari huu ni rasimu ya AI kwa uelewa tu; si rekodi.):\n', bold: true }),
                new TextRun({ text: wonderSummary.summarySw }),
              ],
            }),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(targetPath, buffer);

    const exportDoc = ExportRepo.create({
      recording_id: recordingId,
      docx_filename: filename,
      generated_by: reviewer.trim(),
      summary_en: wonderSummary.summaryEn,
      summary_sw: wonderSummary.summarySw,
      metrics,
      created_at: new Date().toISOString(),
    });

    AuditRepo.logEvent({
      recording_id: recordingId,
      actor: reviewer.trim(),
      action: 'DRAFT_EXPORTED',
      details: `Generated watermarked draft document ${filename}`,
      timestamp: new Date().toISOString(),
    });

    return { exportDoc, filePath: targetPath };
  }

  public static getExportFilePath(filename: string): string {
    return path.join(this.exportDir, path.basename(filename));
  }
}
