/**
 * Pure date utilities for calendar dates (YYYY-MM-DD) avoiding timezone shifts.
 */

/**
 * Returns today's calendar date in local time as 'YYYY-MM-DD'.
 */
export function getLocalTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Validates 'YYYY-MM-DD' calendar string.
 */
export function isValidDateString(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return (
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  );
}

/**
 * Returns the inclusive start and end date for a given Gregorian month.
 */
export function getMonthDateRange(year: number, month: number): { startDate: string; endDate: string } {
  const m = String(month).padStart(2, '0');
  const lastDay = new Date(year, month, 0).getDate();
  return {
    startDate: `${year}-${m}-01`,
    endDate: `${year}-${m}-${String(lastDay).padStart(2, '0')}`,
  };
}

const MONTH_NAME_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04',
  may: '05', jun: '06', jul: '07', aug: '08',
  sep: '09', oct: '10', nov: '11', dec: '12',
};

/**
 * Normalizes any date input (Date object, ISO string, English Date.toString(), DD/MM/YYYY)
 * into a strict 'YYYY-MM-DD' calendar string.
 */
export function normalizeDateString(val: unknown): string {
  if (!val) return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return s;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.substring(0, 10);
  }
  // Match English date strings like "Wed Sep 30 2026 00:00:00 GMT+0700 (Giờ Đông Dương)"
  const monthMatch = s.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s+(\d{4})/i);
  if (monthMatch) {
    const month = MONTH_NAME_MAP[monthMatch[1].toLowerCase()];
    const day = monthMatch[2].padStart(2, '0');
    const year = monthMatch[3];
    return `${year}-${month}-${day}`;
  }
  // Match DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }
  // Fallback to Date parser
  const cleaned = s.replace(/\s*\([^\)]*\)\s*$/, '');
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return s;
}

/**
 * Formats 'YYYY-MM-DD' to Vietnamese display format: 'DD/MM/YYYY' or 'Hôm nay' / 'Hôm qua'.
 */
export function formatDateVN(dateStr: string, includeRelative = false): string {
  if (!dateStr) return '';
  const cleanStr = normalizeDateString(dateStr);
  const [year, month, day] = cleanStr.split('-');
  if (!year || !month || !day) return dateStr;
  
  if (includeRelative) {
    const today = getLocalTodayDateString();
    if (cleanStr === today) return 'Hôm nay';
    
    // Check yesterday
    const now = new Date();
    now.setDate(now.getDate() - 1);
    const yesterday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (cleanStr === yesterday) return 'Hôm qua';
  }
  
  return `${day}/${month}/${year}`;
}

/**
 * Formats year and month to 'Tháng MM/YYYY'.
 */
export function formatMonthYear(year: number, month: number): string {
  return `Tháng ${String(month).padStart(2, '0')}/${year}`;
}

/**
 * Generates an array of sequential 'YYYY-MM' strings between startMonth and endMonth inclusive.
 * If startMonth > endMonth, returns [endMonth].
 */
export function getYearMonthSequence(startMonth: string, endMonth: string): string[] {
  if (startMonth > endMonth) return [endMonth];
  const [startYear, startM] = startMonth.split('-').map(Number);
  const [endYear, endM] = endMonth.split('-').map(Number);

  const months: string[] = [];
  let curY = startYear;
  let curM = startM;

  while (curY < endYear || (curY === endYear && curM <= endM)) {
    months.push(`${curY}-${String(curM).padStart(2, '0')}`);
    curM++;
    if (curM > 12) {
      curM = 1;
      curY++;
    }
  }

  return months;
}
