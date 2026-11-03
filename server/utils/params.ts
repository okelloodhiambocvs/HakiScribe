/**
 * Helper to safely extract integer ID and string params in Express 5.
 */

export function parseIdParam(param: string | number | string[] | undefined): number {
  if (param === undefined || param === null) return 0;
  if (typeof param === 'number') return Number.isInteger(param) && param > 0 ? param : 0;
  const val = (Array.isArray(param) ? param[0] : String(param)).trim();
  if (!/^\d+$/.test(val)) return 0;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) || parsed <= 0 ? 0 : parsed;
}

export function parseStringParam(param: string | string[] | undefined): string {
  if (!param) return '';
  return Array.isArray(param) ? param[0] : param;
}
