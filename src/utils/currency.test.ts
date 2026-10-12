import { describe, it, expect } from 'vitest';
import {
  formatVND,
  formatNumberWithDots,
  isValidVNDAmount,
  parseAmountInput,
  numberToVietnameseWords,
} from './currency';

describe('currency utilities', () => {
  describe('formatVND', () => {
    it('formats whole integer VND correctly', () => {
      expect(formatVND(35000)).toBe('35.000 ₫');
      expect(formatVND(1000000)).toBe('1.000.000 ₫');
      expect(formatVND(0)).toBe('0 ₫');
    });

    it('formats negative numbers with leading minus', () => {
      expect(formatVND(-50000)).toBe('-50.000 ₫');
    });
  });

  describe('formatNumberWithDots', () => {
    it('groups every 3 digits with a dot', () => {
      expect(formatNumberWithDots(120300)).toBe('120.300');
      expect(formatNumberWithDots('35000')).toBe('35.000');
      expect(formatNumberWithDots('500')).toBe('500');
      expect(formatNumberWithDots('')).toBe('');
    });
  });

  describe('isValidVNDAmount', () => {
    it('accepts positive whole integers', () => {
      expect(isValidVNDAmount(35000)).toBe(true);
      expect(isValidVNDAmount(1)).toBe(true);
    });

    it('rejects zero, negative numbers, floats, and strings', () => {
      expect(isValidVNDAmount(0)).toBe(false);
      expect(isValidVNDAmount(-100)).toBe(false);
      expect(isValidVNDAmount(35.5)).toBe(false);
      expect(isValidVNDAmount('35000')).toBe(false);
      expect(isValidVNDAmount(null)).toBe(false);
    });
  });

  describe('parseAmountInput', () => {
    it('parses plain numbers, dotted numbers, and shortcuts', () => {
      expect(parseAmountInput('35000')).toBe(35000);
      expect(parseAmountInput('35.000')).toBe(35000);
      expect(parseAmountInput('35k')).toBe(35000);
      expect(parseAmountInput('2tr')).toBe(2000000);
      expect(parseAmountInput('50.000 đ')).toBe(50000);
    });

    it('throws error for invalid input', () => {
      expect(() => parseAmountInput('')).toThrow();
      expect(() => parseAmountInput('abc')).toThrow();
      expect(() => parseAmountInput('-50000')).toThrow();
    });
  });

  describe('numberToVietnameseWords', () => {
    it('translates VND amount into accurate Vietnamese text words', () => {
      expect(numberToVietnameseWords(35000)).toBe('Ba mươi lăm nghìn đồng');
      expect(numberToVietnameseWords(120300)).toBe('Một trăm hai mươi nghìn ba trăm đồng');
      expect(numberToVietnameseWords(25000000)).toBe('Hai mươi lăm triệu đồng');
      expect(numberToVietnameseWords(500000)).toBe('Năm trăm nghìn đồng');
    });

    it('returns empty string for non-positive or invalid amounts', () => {
      expect(numberToVietnameseWords(0)).toBe('');
      expect(numberToVietnameseWords(-100)).toBe('');
    });
  });
});
