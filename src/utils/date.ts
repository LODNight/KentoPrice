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

/**
 * Formats 'YYYY-MM-DD' to Vietnamese display format: 'DD/MM/YYYY' or 'Hôm nay' / 'Hôm qua'.
 */
export function formatDateVN(dateStr: string, includeRelative = false): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  
  if (includeRelative) {
    const today = getLocalTodayDateString();
    if (dateStr === today) return 'Hôm nay';
    
    // Check yesterday
    const now = new Date();
    now.setDate(now.getDate() - 1);
    const yesterday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (dateStr === yesterday) return 'Hôm qua';
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
