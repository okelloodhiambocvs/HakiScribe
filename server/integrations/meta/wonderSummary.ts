import { TranscriptSegment } from '../../../shared/types';
import { isMetaConfigured, META_API_CONFIG, postMetaApi } from './metaClient';
import { AuditRepo } from '../../db/repositories/auditRepo';

export const WONDER_DISCLAIMER_EN =
  'Not legal advice. This summary is an AI-generated orientation draft only; it is not the record. Ask the court clerk or a lawyer about your case.';

export const WONDER_DISCLAIMER_SW =
  'Hii si ushauri wa kisheria. Muhtasari huu ni rasimu ya AI kwa uelewa tu; si rekodi. Uliza karani wa mahakama au wakili kuhusu kesi yako.';

export interface WonderSummaryResult {
  summaryEn: string;
  summarySw: string;
  model: string;
}

export async function generateWonderSummary(
  segments: TranscriptSegment[],
  forceMock = false
): Promise<WonderSummaryResult> {
  const modelName = isMetaConfigured() && !forceMock ? META_API_CONFIG.wonderModel : 'muse-wonder-mock';

  if (!forceMock && isMetaConfigured()) {
    try {
      const fullText = segments.map((s) => `${s.speaker}: ${s.text_current}`).join('\n');
      const prompt = `Summarize this court proceeding in plain English and plain Kiswahili. Output JSON: { "summary_en": "...", "summary_sw": "..." }`;

      const result = await postMetaApi<{ summary_en: string; summary_sw: string }>(
        '/chat/completions',
        {
          model: META_API_CONFIG.wonderModel,
          messages: [{ role: 'user', content: `${prompt}\n\n${fullText}` }],
        }
      );

      if (result.ok && result.data && result.data.summary_en && result.data.summary_sw) {
        AuditRepo.logApiCall({
          timestamp: new Date().toISOString(),
          service: 'muse-wonder',
          model: META_API_CONFIG.wonderModel,
          endpoint: '/summarize',
          status: 'SUCCESS',
          duration_ms: result.latencyMs,
          note: 'Generated bilingual plain-language orientation summaries',
        });

        return {
          summaryEn: result.data.summary_en,
          summarySw: result.data.summary_sw,
          model: META_API_CONFIG.wonderModel,
        };
      }
    } catch (err: any) {
      console.warn('Meta Wonder call failed; using synthetic bilingual orientation draft:', err?.message);
    }
  }

  // Deterministic high-quality synthetic summary for CR 123/2026
  AuditRepo.logApiCall({
    timestamp: new Date().toISOString(),
    service: 'muse-wonder',
    model: 'muse-wonder-mock',
    endpoint: '/summarize',
    status: 'MOCK',
    duration_ms: 95,
    note: 'Generated synthetic bilingual orientation draft for Appendix D',
  });

  return {
    summaryEn:
      'The court heard criminal case CR 123 of 2026 where the accused denied the theft charge under Penal Code Section 268. ' +
      'The defence applied for bail while the prosecution opposed citing potential witness interference. ' +
      'The court ordered a mention on 20 November 2026 with a formal bail ruling scheduled for 27 November 2026.',
    summarySw:
      'Mahakama ilisikiliza kesi ya jinai CR 123 ya 2026 ambapo mshtakiwa alikana shtaka la wizi chini ya Kifungu 268 cha Kanuni ya Adhabu. ' +
      'Upande wa utetezi uliomba dhamana huku upande wa mashtaka ukipinga kutokana na hofu ya kuingiliwa kwa mashahidi. ' +
      'Mahakama ilipanga kutajwa tena kwa kesi tarehe 20 Novemba 2026 na uamuzi rasmi wa dhamana kutolewa tarehe 27 Novemba 2026.',
    model: 'muse-wonder-mock',
  };
}
