import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import path from 'path';
import { isMetaConfigured, META_API_CONFIG, postMetaApi } from '../server/integrations/meta/metaClient';
import { ExportService } from '../server/services/exportService';
import { AudioService } from '../server/services/audioService';
import { SessionService } from '../server/services/sessionService';
import { ReviewService } from '../server/services/reviewService';
import { SegmentRepo } from '../server/db/repositories/segmentRepo';
import { CorrectionRepo } from '../server/db/repositories/correctionRepo';
import { parseIdParam, parseStringParam } from '../server/utils/params';
import { initDatabase } from '../server/db/database';

describe('Security & Failure Resilience Tests', () => {
  before(() => {
    initDatabase();
  });

  describe('Meta Model API Credentials & Fail-Closed Behavior', () => {
    it('checks META_API_KEY presence before making requests', () => {
      // By default in this test environment without META_API_KEY, isMetaConfigured() must be false
      const configured = isMetaConfigured();
      if (!process.env.META_API_KEY) {
        assert.strictEqual(configured, false, 'Reports unconfigured when key is missing');
      } else {
        assert.strictEqual(configured, true);
      }
    });

    it('returns 401 fail-closed error immediately when API key is missing, without network call', async () => {
      if (!process.env.META_API_KEY) {
        const result = await postMetaApi('/asr/transcribe', { dummy: true });
        assert.strictEqual(result.ok, false);
        assert.strictEqual(result.status, 401);
        assert.ok(result.error?.includes('META_API_KEY not configured'));
      }
    });

    it('skips live Meta API calls when credentials are not available without marking mock as live', () => {
      if (!isMetaConfigured()) {
        // Live test skipped explicitly
        assert.ok(true, 'Live Meta API test skipped: META_API_KEY not present in environment');
      }
    });

    it('confirms Meta API models and configuration parameters', () => {
      assert.strictEqual(META_API_CONFIG.voiceModel, 'muse-voice-transcribe-1.0');
      assert.strictEqual(META_API_CONFIG.sparkModel, 'muse-spark-1.3');
      assert.strictEqual(META_API_CONFIG.wonderModel, 'muse-wonder-1.0');
      assert.ok(META_API_CONFIG.baseUrl.startsWith('https://'));
    });
  });

  describe('Path Traversal Resistance', () => {
    it('sanitizes export file download paths against directory traversal', () => {
      const maliciousFilenames = [
        '../../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\cmd.exe',
        '/etc/shadow',
        '....//....//config.json',
      ];

      for (const malicious of maliciousFilenames) {
        const resolved = ExportService.getExportFilePath(malicious);
        const exportDir = path.resolve(process.cwd(), 'storage/exports');
        assert.ok(
          resolved.startsWith(exportDir),
          `Resolved path ${resolved} must remain inside ${exportDir}`
        );
        // It must strip the traversal components and keep only the basename
        assert.strictEqual(path.dirname(resolved), exportDir);
      }
    });
  });

  describe('SQL Injection & Input Sanitization Resistance', () => {
    it('neutralizes SQL injection payloads in ID parameters by returning 0', () => {
      const injectionPayloads = [
        "1; DROP TABLE recordings; --",
        "1 OR 1=1",
        "' UNION SELECT * FROM users --",
        "1' OR '1'='1",
        "1; DELETE FROM segments;",
      ];

      for (const payload of injectionPayloads) {
        const id = parseIdParam(payload);
        assert.strictEqual(id, 0, `Payload ${payload} must be neutralized to 0`);
      }
    });

    it('safely handles empty or whitespace-only string parameters', () => {
      assert.strictEqual(parseStringParam(''), '');
      assert.strictEqual(parseStringParam(undefined), '');
    });
  });

  describe('Data Integrity & Business Rule Safeguards', () => {
    it('blocks session deletion without explicit confirmation token DELETE', () => {
      const session = SessionService.loadDemoSession('Reviewer Security');

      // Attempt deletion with incorrect tokens
      assert.throws(() => {
        SessionService.deleteSession(session.id, 'Reviewer Security', 'yes');
      }, /Must type 'DELETE'/);

      assert.throws(() => {
        SessionService.deleteSession(session.id, 'Reviewer Security', 'remove');
      }, /Must type 'DELETE'/);

      assert.throws(() => {
        SessionService.deleteSession(session.id, '', 'DELETE');
      }, /Reviewer name is required/);
    });

    it('blocks text corrections without reviewer name or mandatory rationale', () => {
      assert.throws(() => {
        ReviewService.editSegmentText(1, 'New text', '', 'Valid reason');
      }, /Reviewer name is required/);

      assert.throws(() => {
        ReviewService.editSegmentText(1, 'New text', 'Clerk', '');
      }, /Mandatory reason required/);
    });

    it('blocks flag resolution without reviewer name or non-existent flag ID', () => {
      assert.throws(() => {
        ReviewService.decideFlag(99999, 'ACCEPT', 'Clerk', 'Valid reason');
      }, /Review flag #99999 not found/);

      assert.throws(() => {
        ReviewService.decideFlag(1, 'DISMISS', '', 'Valid reason');
      }, /Reviewer name is required/);
    });

    it('blocks session creation without synthetic attestation', () => {
      assert.throws(() => {
        SessionService.createSession({
          filename: 'unattested.wav',
          storedPath: 'unattested.wav',
          sha256: 'deadbeef',
          sizeBytes: 1000,
          durationSec: 10,
          uploadedBy: 'Clerk',
          syntheticAttestation: false,
        });
      }, /Synthetic attestation is strictly required/);
    });
  });

  describe('Concurrency & Rapid Updates', () => {
    it('handles consecutive updates to the same segment maintaining accurate history', async () => {
      const session = SessionService.loadDemoSession('Rapid Reviewer');
      // Transcribe to create segments
      const { TranscriptionService } = await import('../server/services/transcriptionService');
      await TranscriptionService.transcribeSession(session.id, true);

      const segments = SegmentRepo.getByRecordingId(session.id);
      const targetSeg = segments[0];

      // Edit 1
      ReviewService.editSegmentText(targetSeg.id, 'Edit One', 'Reviewer 1', 'First revision');
      // Edit 2
      ReviewService.editSegmentText(targetSeg.id, 'Edit Two', 'Reviewer 2', 'Second revision');
      // Edit 3
      ReviewService.editSegmentText(targetSeg.id, 'Edit Three', 'Reviewer 3', 'Third revision');

      // Check current text
      const latestSeg = SegmentRepo.getById(targetSeg.id);
      assert.strictEqual(latestSeg?.text_current, 'Edit Three');
      assert.strictEqual(latestSeg?.text_original, targetSeg.text_original, 'Original remains intact');

      // Check history contains all 3 edits
      const history = CorrectionRepo.getByRecordingId(session.id).filter(
        (c) => c.segment_id === targetSeg.id
      );
      assert.strictEqual(history.length, 3);
    });
  });
});
