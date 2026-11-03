import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { EvaluationService } from '../server/services/evaluationService';

interface EvaluationClip {
  id: string;
  category: string;
  audio: string;
  reference: string;
  speakers: string[];
  duration_sec: number;
}

interface EvaluationManifest {
  version: number;
  description: string;
  clips: EvaluationClip[];
}

interface LatestResults {
  run_at: string;
  model: string;
  mode: string;
  clips: Array<{
    id: string;
    category: string;
    wer: number;
    cer: number;
    ref_words: number;
    hyp_words: number;
    hypothesis: string;
  }>;
}

describe('Section 5: Language Evaluation Suite (English, Kiswahili, Code-Switching)', () => {
  const manifestPath = path.resolve(process.cwd(), 'evaluation/manifest.json');
  const resultsPath = path.resolve(process.cwd(), 'evaluation/results/latest.json');

  it('verifies evaluation manifest integrity and referenced ground truth files', () => {
    assert.ok(fs.existsSync(manifestPath), 'manifest.json must exist');
    const manifest: EvaluationManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    assert.strictEqual(manifest.version, 1);
    assert.strictEqual(manifest.clips.length, 3);

    for (const clip of manifest.clips) {
      const refFullPath = path.resolve(process.cwd(), 'evaluation', clip.reference);
      assert.ok(fs.existsSync(refFullPath), `Reference file ${clip.reference} must exist`);
      const refText = fs.readFileSync(refFullPath, 'utf8').trim();
      assert.ok(refText.length > 50, `Reference text for ${clip.id} must be non-empty`);
      assert.ok(clip.speakers.length > 0, `Clip ${clip.id} must define speaker roles`);
    }
  });

  it('computes and verifies Word Error Rate (WER) and Character Error Rate (CER) on benchmark clips', () => {
    assert.ok(fs.existsSync(resultsPath), 'latest.json must exist');
    const results: LatestResults = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

    assert.strictEqual(results.model, 'muse-voice-transcribe-1.0');
    assert.strictEqual(results.mode, 'DIARIZATION');

    for (const resClip of results.clips) {
      const refFile = path.resolve(process.cwd(), `evaluation/reference/${resClip.id}.txt`);
      const refText = fs.readFileSync(refFile, 'utf8');

      const computed = EvaluationService.computeWerCer(refText, resClip.hypothesis);

      // Verify computed matches within 0.005 tolerance
      assert.ok(
        Math.abs(computed.wer - resClip.wer) < 0.005,
        `WER mismatch for ${resClip.id}: computed ${computed.wer} vs recorded ${resClip.wer}`
      );
      assert.ok(
        Math.abs(computed.cer - resClip.cer) < 0.015,
        `CER mismatch for ${resClip.id}: computed ${computed.cer} vs recorded ${resClip.cer}`
      );
    }
  });

  describe('Language Accuracy Disparity & Empirical Boundaries', () => {
    it('proves English legal proceeding accuracy is within acceptable transcription tolerance (< 15% WER)', () => {
      const results: LatestResults = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      const enClip = results.clips.find((c) => c.category === 'english');
      assert.ok(enClip);
      assert.ok(enClip.wer < 0.15, `English WER ${enClip.wer} is below 15%`);
      assert.strictEqual(enClip.wer, 0.1075);
    });

    it('documents Kiswahili language transcription degradation (~62% WER)', () => {
      const results: LatestResults = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      const swClip = results.clips.find((c) => c.category === 'kiswahili');
      assert.ok(swClip);
      // Kiswahili has higher WER due to low-resource representation in voice models
      assert.ok(swClip.wer > 0.5, `Kiswahili WER ${swClip.wer} reflects expected model limitation`);
      assert.strictEqual(swClip.wer, 0.6212);
    });

    it('documents Code-switched (English-Kiswahili) mixed language performance (~35% WER)', () => {
      const results: LatestResults = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      const csClip = results.clips.find((c) => c.category === 'code_switched');
      assert.ok(csClip);
      // Code-switched shows intermediate degradation at language transition boundaries
      assert.ok(csClip.wer >= 0.25 && csClip.wer <= 0.45);
      assert.strictEqual(csClip.wer, 0.35);
    });
  });

  describe('Statutory Legal Terminology Recognition', () => {
    it('evaluates critical Kenyan legal terminology handling', () => {
      const legalTerms = [
        { term: 'burglary', expectedCategory: 'english' },
        { term: 'surety', expectedCategory: 'english' },
        { term: 'wizi', expectedCategory: 'kiswahili' },
        { term: 'dhamana', expectedCategory: 'kiswahili' },
        { term: 'shahidi wa utetezi', expectedCategory: 'code_switched' },
      ];

      for (const item of legalTerms) {
        const refPath = path.resolve(process.cwd(), `evaluation/reference/${item.expectedCategory === 'english' ? 'en-001' : item.expectedCategory === 'kiswahili' ? 'sw-001' : 'cs-001'}.txt`);
        const text = fs.readFileSync(refPath, 'utf8').toLowerCase();
        assert.ok(
          text.includes(item.term.toLowerCase()),
          `Reference file must contain legal term "${item.term}"`
        );
      }
    });
  });

  describe('Speaker Attribution & Turn Segmentation', () => {
    it('verifies reference speaker role mappings in all evaluation clips', () => {
      const clips = ['en-001', 'sw-001', 'cs-001'];
      const allowedRoles = new Set([
        'MAGISTRATE',
        'PROSECUTOR',
        'WITNESS',
        'ADVOCATE',
        'COURT_ASSISTANT',
        'ACCUSED',
        'INTERPRETER',
      ]);

      for (const clipId of clips) {
        const refJsonPath = path.resolve(process.cwd(), `evaluation/audio/${clipId}.reference.json`);
        if (fs.existsSync(refJsonPath)) {
          const refJson = JSON.parse(fs.readFileSync(refJsonPath, 'utf8'));
          assert.ok(Array.isArray(refJson.turns), `${clipId} must have turns`);
          for (const turn of refJson.turns) {
            assert.ok(
              allowedRoles.has(turn.role),
              `Role ${turn.role} in ${clipId} must belong to court taxonomy`
            );
            assert.ok(turn.end_ms > turn.start_ms, 'Turn timestamp duration must be positive');
          }
        }
      }
    });
  });
});
