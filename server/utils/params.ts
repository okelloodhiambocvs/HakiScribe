/**
 * Helper to safely extract integer ID and string params in Express 5.
 */

export function parseIdParam(param: string | string[] | undefined): number {
  if (!param) return 0;
  const val = Array.isArray(param) ? param[0] : param;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? 0 : parsed;
}

export function parseStringParam(param: string | string[] | undefined): string {
  if (!param) return '';
  return Array.isArray(param) ? param[0] : param;
}
