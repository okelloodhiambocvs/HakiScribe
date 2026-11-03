import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AudioService } from '../server/services/audioService';
import { EvaluationService } from '../server/services/evaluationService';
import { parseIdParam, parseStringParam } from '../server/utils/params';
import { ALLOWED_AUDIO_EXTENSIONS, TAXONOMY_ROLES, MAX_AUDIO_BYTES } from '../shared/taxonomy';

describe('Unit Tests: Pure Logic & Service Modules', () => {
  describe('AudioService Validation & Hashing', () => {
    it('validates a correct WAV audio buffer and computes SHA-256', () => {
      const dummyBuffer = Buffer.from('RIFF....WAVEfmt ....data....');
      const mockFile: Express.Multer.File = {
        fieldname: 'audio',
        originalname: 'court_hearing_01.wav',
        encoding: '7bit',
        mimetype: 'audio/wav',
        size: dummyBuffer.length,
        buffer: dummyBuffer,
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };

      const validated = AudioService.validateAudioFile(mockFile);
      assert.strictEqual(validated.filename, 'court_hearing_01.wav');
      assert.strictEqual(validated.sizeBytes, dummyBuffer.length);
      assert.strictEqual(typeof validated.sha256, 'string');
      assert.strictEqual(validated.sha256.length, 64, 'SHA-256 is 64 hex characters');
      assert.ok(validated.storedPath.includes('court_hearing_01.wav'));
    });

    it('rejects unsupported audio extensions (.exe, .mp4, .pdf)', () => {
      const dummyBuffer = Buffer.from('fake data');
      const badExtensions = ['malware.exe', 'video.mp4', 'document.pdf', 'script.sh'];

      for (const filename of badExtensions) {
        const mockFile: Express.Multer.File = {
          fieldname: 'audio',
          originalname: filename,
          encoding: '7bit',
          mimetype: 'application/octet-stream',
          size: dummyBuffer.length,
          buffer: dummyBuffer,
          destination: '',
          filename: '',
          path: '',
          stream: null as any,
        };

        assert.throws(
          () => AudioService.validateAudioFile(mockFile),
          /Unsupported audio format/,
          `Should reject ${filename}`
        );
      }
    });

    it('rejects audio exceeding the 25MB maximum limit', () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'audio',
        originalname: 'huge_court_audio.wav',
        encoding: '7bit',
        mimetype: 'audio/wav',
        size: MAX_AUDIO_BYTES + 1024,
        buffer: Buffer.alloc(100), // mock representation
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };

      assert.throws(
        () => AudioService.validateAudioFile(mockFile),
        /exceeds maximum limit of 25MB/
      );
    });

    it('rejects empty audio files or null buffers', () => {
      assert.throws(() => {
        AudioService.validateAudioFile(null as any);
      }, /No audio file uploaded/);

      const emptyFile: any = { originalname: 'empty.wav', buffer: null, size: 0 };
      assert.throws(() => {
        AudioService.validateAudioFile(emptyFile);
      }, /No audio file uploaded/);
    });
  });

  describe('EvaluationService: Normalisation & Levenshtein Metrics', () => {
    it('normalises legal text: strips punctuation, lowercase, preserves Swahili characters', () => {
      const raw = '  Mheshimiwa Hakimu! "Kesi No. 45/2026" — Mshtakiwa: John Kamau.  ';
      const norm = EvaluationService.normaliseText(raw);
      assert.strictEqual(norm, 'mheshimiwa hakimu kesi no 45 2026 mshtakiwa john kamau');
    });

    it('handles empty and whitespace-only strings gracefully', () => {
      assert.strictEqual(EvaluationService.normaliseText(''), '');
      assert.strictEqual(EvaluationService.normaliseText('   \n\t  '), '');
    });

    it('computes Levenshtein distance on words and characters', () => {
      // 0 distance for identical arrays
      assert.strictEqual(EvaluationService.levenshteinDistance(['a', 'b'], ['a', 'b']), 0);

      // Single insertion
      assert.strictEqual(EvaluationService.levenshteinDistance(['a'], ['a', 'b']), 1);

      // Single deletion
      assert.strictEqual(EvaluationService.levenshteinDistance(['a', 'b'], ['a']), 1);

      // Single substitution
      assert.strictEqual(EvaluationService.levenshteinDistance(['a', 'b'], ['a', 'c']), 1);
    });

    it('computes exact WER for known substitutions, deletions, and insertions', () => {
      const ref = 'the accused pleaded not guilty to theft';
      // 1 substitution ('denied' for 'pleaded'), 1 deletion (missing 'to theft')
      // ref words = 7 words
      const hyp = 'the accused denied not guilty';
      const { wer, cer } = EvaluationService.computeWerCer(ref, hyp);

      // Levenshtein: ref=[the, accused, pleaded, not, guilty, to, theft]
      // hyp=[the, accused, denied, not, guilty] -> 1 sub ('pleaded'->'denied') + 2 del ('to', 'theft') = 3 edits / 7 words
      assert.strictEqual(wer, Number((3 / 7).toFixed(4)));
      assert.ok(cer > 0 && cer <= 1);
    });

    it('evaluates session metrics with empty segments and valid corrections', () => {
      const emptyMetrics = EvaluationService.evaluateSession([], []);
      assert.strictEqual(emptyMetrics.ai_vs_reviewed.reason, 'No transcript present');

      const dummySegments: any[] = [
        { id: 1, idx: 0, text_original: 'court begins', text_current: 'Court begins.', speaker: 'MAGISTRATE', speaker_label: 'Speaker A' },
        { id: 2, idx: 1, text_original: 'case forty five', text_current: 'Case 45.', speaker: 'PROSECUTOR', speaker_label: 'Speaker B' },
      ];
      const dummyCorrections: any[] = [
        { id: 1, reviewer_name: 'Clerk Alice', reason: 'Corrected capitalisation', timestamp: '2026-11-03T10:00:00Z' },
      ];

      const metrics = EvaluationService.evaluateSession(dummySegments, dummyCorrections, 120);
      assert.strictEqual(metrics.traceability.values.completeness_pct, 100);
      assert.strictEqual(metrics.review_time.values.elapsed_seconds, 120);
      assert.strictEqual(metrics.speaker.values.attribution_pct, 100);
    });
  });

  describe('Taxonomy & Roles Integrity', () => {
    it('defines official Kenyan court roles with valid display labels', () => {
      assert.ok(Array.isArray(TAXONOMY_ROLES));
      assert.ok(TAXONOMY_ROLES.includes('MAGISTRATE'));
      assert.ok(TAXONOMY_ROLES.includes('PROSECUTOR'));
      assert.ok(TAXONOMY_ROLES.includes('ADVOCATE'));
      assert.ok(TAXONOMY_ROLES.includes('ACCUSED'));
      assert.ok(TAXONOMY_ROLES.includes('COURT_ASSISTANT'));
      assert.ok(TAXONOMY_ROLES.includes('INTERPRETER'));
    });

    it('enforces allowed audio extensions whitelist', () => {
      assert.ok(ALLOWED_AUDIO_EXTENSIONS.includes('.wav'));
      assert.ok(ALLOWED_AUDIO_EXTENSIONS.includes('.mp3'));
      assert.ok(ALLOWED_AUDIO_EXTENSIONS.includes('.m4a'));
      assert.ok(ALLOWED_AUDIO_EXTENSIONS.includes('.ogg'));
    });
  });

  describe('Parameter Parsing & Input Sanitization', () => {
    it('parses valid positive integer IDs correctly', () => {
      assert.strictEqual(parseIdParam('123'), 123);
      assert.strictEqual(parseIdParam(456), 456);
    });

    it('safely rejects invalid, negative, or non-numeric IDs by returning 0', () => {
      assert.strictEqual(parseIdParam('abc'), 0);
      assert.strictEqual(parseIdParam('-5'), 0);
      assert.strictEqual(parseIdParam('0'), 0);
      assert.strictEqual(parseIdParam("1; DROP TABLE sessions;--"), 0);
    });

    it('parses valid strings and handles empty/undefined gracefully', () => {
      assert.strictEqual(parseStringParam('valid_filename.docx'), 'valid_filename.docx');
      assert.strictEqual(parseStringParam(''), '');
      assert.strictEqual(parseStringParam(undefined), '');
    });
  });
});
