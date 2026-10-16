/**
 * Pure currency utilities for whole integer VND calculations & formatting.
 */

/**
 * Formats a whole integer VND amount to Vietnamese currency standard.
 * e.g. 35000 -> "35.000 ₫", 0 -> "0 ₫"
 */
export function formatVND(amount: number): string {
  if (!Number.isFinite(amount)) return '0 ₫';
  const rounded = Math.round(amount);
  const formatted = new Intl.NumberFormat('vi-VN').format(Math.abs(rounded));
  const sign = rounded < 0 ? '-' : '';
  return `${sign}${formatted} ₫`;
}

/**
 * Formats a number with thousand dots without currency symbol.
 * e.g. 120300 -> "120.300", 0 -> "0"
 */
export function formatNumberWithDots(val: number | string): string {
  const digits = String(val).replace(/\D/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10);
  if (!Number.isFinite(num)) return '';
  return new Intl.NumberFormat('vi-VN').format(num);
}

/**
 * Validates if an amount is a valid positive whole VND integer.
 */
export function isValidVNDAmount(amount: unknown): amount is number {
  return (
    typeof amount === 'number' &&
    Number.isInteger(amount) &&
    amount > 0 &&
    amount <= 1_000_000_000_000
  );
}

/**
 * Validates if a budget amount is a valid non-negative whole VND integer (>= 0).
 * In accordance with PDR-011, budget can be 0 ₫.
 */
export function isValidBudgetAmount(amount: unknown): amount is number {
  return (
    typeof amount === 'number' &&
    Number.isInteger(amount) &&
    amount >= 0 &&
    amount <= 1_000_000_000_000
  );
}

/**
 * Parses user input string into a valid integer VND amount.
 * Handles:
 *  - "35000" -> 35000
 *  - "35.000" -> 35000
 *  - "35,000" -> 35000
 *  - "35k" / "35K" -> 35000
 *  - "2tr" / "2m" -> 2000000
 * Throws an Error with friendly message if invalid.
 */
export function parseAmountInput(rawInput: string): number {
  if (!rawInput) {
    throw new Error('Vui lòng nhập số tiền');
  }

  let cleaned = rawInput.trim().toLowerCase();

  // Multiplier shortcuts
  let multiplier = 1;
  if (cleaned.endsWith('k')) {
    multiplier = 1_000;
    cleaned = cleaned.slice(0, -1).trim();
  } else if (cleaned.endsWith('tr') || cleaned.endsWith('m')) {
    multiplier = 1_000_000;
    cleaned = cleaned.replace(/tr|m$/, '').trim();
  }

  // Remove currency symbol, spaces, and thousand dots/commas
  cleaned = cleaned.replace(/₫|đ|vnd/gi, '').trim();
  cleaned = cleaned.replace(/[.,\s]/g, '');

  if (!cleaned || !/^\d+$/.test(cleaned)) {
    throw new Error('Số tiền không hợp lệ');
  }

  const numericValue = parseInt(cleaned, 10) * multiplier;

  if (!isValidVNDAmount(numericValue)) {
    throw new Error('Số tiền phải là số nguyên dương lớn hơn 0');
  }

  return numericValue;
}

/**
 * Converts VND number into friendly Vietnamese text words.
 * e.g. 120300 -> "Một trăm hai mươi nghìn ba trăm đồng"
 * e.g. 35000 -> "Ba mươi lăm nghìn đồng"
 */
export function numberToVietnameseWords(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return '';
  if (amount > 1_000_000_000_000) return 'Số tiền quá lớn';

  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ'];

  function readGroupOfThree(n: number, isFirst: boolean): string {
    const tram = Math.floor(n / 100);
    const chuc = Math.floor((n % 100) / 10);
    const donvi = n % 10;
    let res = '';

    if (tram > 0 || !isFirst) {
      res += `${digits[tram]} trăm `;
    }

    if (chuc > 1) {
      res += `${digits[chuc]} mươi `;
      if (donvi === 1) res += 'mốt ';
      else if (donvi === 4) res += 'tư ';
      else if (donvi === 5) res += 'lăm ';
      else if (donvi > 0) res += `${digits[donvi]} `;
    } else if (chuc === 1) {
      res += 'mười ';
      if (donvi === 5) res += 'lăm ';
      else if (donvi > 0) res += `${digits[donvi]} `;
    } else if (chuc === 0 && donvi > 0) {
      if (tram > 0 || !isFirst) res += 'lẻ ';
      res += `${digits[donvi]} `;
    }

    return res.trim();
  }

  let num = Math.floor(amount);
  const groups: number[] = [];
  while (num > 0) {
    groups.push(num % 1000);
    num = Math.floor(num / 1000);
  }

  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (g > 0) {
      const isFirst = i === groups.length - 1;
      const groupWords = readGroupOfThree(g, isFirst);
      const unit = units[i] || '';
      parts.push(`${groupWords} ${unit}`.trim());
    }
  }

  const fullText = parts.join(' ').trim();
  if (!fullText) return '';

  // Capitalize first character and append "đồng"
  const capitalized = fullText.charAt(0).toUpperCase() + fullText.slice(1);
  return `${capitalized} đồng`;
}
