import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.HAKISCRIBE_DB_PATH || path.resolve(process.cwd(), 'data/hakiscribe.db');

// Ensure parent directory exists
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

export const db: Database.Database = new Database(DB_PATH);

// Configure WAL mode and foreign keys for high reliability and concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL,
      court_station TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recordings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      stored_path TEXT NOT NULL,
      sha256 TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      duration_sec REAL NOT NULL,
      uploaded_by TEXT NOT NULL,
      synthetic_attestation INTEGER NOT NULL DEFAULT 1,
      transcription_source TEXT,
      transcription_model TEXT,
      capture_source TEXT NOT NULL DEFAULT 'upload',
      status TEXT NOT NULL DEFAULT 'UPLOADED',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS segments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recording_id INTEGER NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
      idx INTEGER NOT NULL,
      start_sec REAL NOT NULL,
      end_sec REAL NOT NULL,
      speaker TEXT NOT NULL,
      speaker_label TEXT NOT NULL,
      confidence REAL,
      language TEXT NOT NULL DEFAULT 'en',
      text_original TEXT NOT NULL,
      text_current TEXT NOT NULL,
      is_approximate INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS flags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recording_id INTEGER NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
      segment_id INTEGER NOT NULL REFERENCES segments(id) ON DELETE CASCADE,
      segment_idx INTEGER NOT NULL,
      flag_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      message TEXT NOT NULL,
      evidence TEXT NOT NULL,
      suggestion TEXT,
      status TEXT NOT NULL DEFAULT 'OPEN',
      resolved_by TEXT,
      resolved_at TEXT,
      reason TEXT,
      related_segment_id INTEGER,
      prompt_version TEXT NOT NULL DEFAULT 'v2',
      evidence_verified INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS corrections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recording_id INTEGER NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
      segment_id INTEGER NOT NULL REFERENCES segments(id) ON DELETE CASCADE,
      field TEXT NOT NULL,
      before_text TEXT NOT NULL,
      after_text TEXT NOT NULL,
      reviewer_name TEXT NOT NULL,
      decision TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recording_id INTEGER NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL,
      witness_designation TEXT,
      description TEXT,
      verified INTEGER NOT NULL DEFAULT 0,
      verified_by TEXT,
      verified_at TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS speaker_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recording_id INTEGER NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
      speaker_label TEXT NOT NULL,
      role TEXT NOT NULL,
      assigned_by TEXT NOT NULL,
      assigned_at TEXT NOT NULL,
      reason TEXT,
      participant_id INTEGER REFERENCES participants(id) ON DELETE SET NULL,
      participant_name TEXT,
      UNIQUE(recording_id, speaker_label)
    );

    CREATE TABLE IF NOT EXISTS exports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recording_id INTEGER NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
      docx_filename TEXT NOT NULL,
      generated_by TEXT NOT NULL,
      summary_en TEXT NOT NULL,
      summary_sw TEXT NOT NULL,
      metrics_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recording_id INTEGER,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS api_calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      service TEXT NOT NULL,
      model TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      status TEXT NOT NULL,
      duration_ms INTEGER NOT NULL,
      note TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS deletion_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recording_id INTEGER NOT NULL,
      reviewer TEXT NOT NULL,
      deleted_at TEXT NOT NULL
    );

    -- Seed default demo user if not exists
    INSERT OR IGNORE INTO users (id, name, email, role, court_station, created_at)
    VALUES ('u-1', 'Judicial Clerk', 'clerk@judiciary.go.ke', 'COURT_CLERK', 'Milimani Law Courts', datetime('now'));
  `);

  // Migrate pre-existing databases: participant columns on speaker_roles.
  const roleColumns = db.prepare(`PRAGMA table_info(speaker_roles)`).all() as Array<{ name: string }>;
  const roleColumnNames = new Set(roleColumns.map((c) => c.name));
  if (!roleColumnNames.has('participant_id')) {
    db.exec(`ALTER TABLE speaker_roles ADD COLUMN participant_id INTEGER REFERENCES participants(id) ON DELETE SET NULL`);
  }
  if (!roleColumnNames.has('participant_name')) {
    db.exec(`ALTER TABLE speaker_roles ADD COLUMN participant_name TEXT`);
  }
}
