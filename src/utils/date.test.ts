import { describe, it, expect } from 'vitest';
import {
  getLocalTodayDateString,
  isValidDateString,
  getMonthDateRange,
  formatDateVN,
  formatMonthYear,
  getYearMonthSequence,
} from './date';

describe('date utilities', () => {
  it('getLocalTodayDateString returns YYYY-MM-DD format', () => {
    const today = getLocalTodayDateString();
    expect(/^\d{4}-\d{2}-\d{2}$/.test(today)).toBe(true);
  });

  it('isValidDateString validates correct and incorrect dates', () => {
    expect(isValidDateString('2026-10-10')).toBe(true);
    expect(isValidDateString('2026-02-28')).toBe(true);
    expect(isValidDateString('2026-02-29')).toBe(false); // not a leap year
    expect(isValidDateString('invalid')).toBe(false);
  });

  it('getMonthDateRange returns first and last date of month', () => {
    const oct = getMonthDateRange(2026, 10);
    expect(oct.startDate).toBe('2026-10-01');
    expect(oct.endDate).toBe('2026-10-31');

    const febNonLeap = getMonthDateRange(2026, 2);
    expect(febNonLeap.startDate).toBe('2026-02-01');
    expect(febNonLeap.endDate).toBe('2026-02-28');
  });

  it('formatDateVN formats date correctly', () => {
    expect(formatDateVN('2026-10-10')).toBe('10/10/2026');
  });

  it('formatMonthYear formats month year correctly', () => {
    expect(formatMonthYear(2026, 10)).toBe('Tháng 10/2026');
  });

  describe('getYearMonthSequence', () => {
    it('returns single month if startMonth === endMonth', () => {
      expect(getYearMonthSequence('2026-10', '2026-10')).toEqual(['2026-10']);
    });

    it('returns fallback [endMonth] if startMonth > endMonth', () => {
      expect(getYearMonthSequence('2026-11', '2026-10')).toEqual(['2026-10']);
    });

    it('generates sequential months within same year', () => {
      expect(getYearMonthSequence('2026-07', '2026-10')).toEqual([
        '2026-07',
        '2026-08',
        '2026-09',
        '2026-10',
      ]);
    });

    it('generates sequential months spanning across year boundaries', () => {
      expect(getYearMonthSequence('2025-11', '2026-02')).toEqual([
        '2025-11',
        '2025-12',
        '2026-01',
        '2026-02',
      ]);
    });
  });
});
