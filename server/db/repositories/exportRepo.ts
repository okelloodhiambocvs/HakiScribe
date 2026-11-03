import { db } from '../database';
import { ExportDocument } from '../../../shared/types';

export class ExportRepo {
  static create(data: Omit<ExportDocument, 'id'>): ExportDocument {
    const stmt = db.prepare(`
      INSERT INTO exports (
        recording_id, docx_filename, generated_by,
        summary_en, summary_sw, metrics_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      data.recording_id,
      data.docx_filename,
      data.generated_by,
      data.summary_en,
      data.summary_sw,
      JSON.stringify(data.metrics),
      data.created_at
    );

    return { ...data, id: Number(info.lastInsertRowid) };
  }

  static getLatestByRecordingId(recordingId: number): ExportDocument | null {
    const row = db.prepare(`
      SELECT * FROM exports WHERE recording_id = ? ORDER BY id DESC LIMIT 1
    `).get(recordingId) as any;

    if (!row) return null;
    return {
      ...row,
      metrics: JSON.parse(row.metrics_json),
    };
  }

  static listAll(recordingId?: number): ExportDocument[] {
    let query = 'SELECT * FROM exports';
    const params: any[] = [];
    if (recordingId) {
      query += ' WHERE recording_id = ?';
      params.push(recordingId);
    }
    query += ' ORDER BY id DESC';

    const rows = db.prepare(query).all(...params) as any[];
    return rows.map((r) => ({
      ...r,
      metrics: JSON.parse(r.metrics_json),
    }));
  }
}
