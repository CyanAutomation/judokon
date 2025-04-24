import { getValue, formatDate, generateCardTopBar } from './utils';

describe('getValue', () => {
  test('returns the value when it is a string', () => {
    expect(getValue('Hello')).toBe('Hello');
  });

  test('returns fallback when value is not a string', () => {
    expect(getValue(42)).toBe('Unknown');
  });

  test('returns custom fallback when provided', () => {
    expect(getValue(undefined, 'N/A')).toBe('N/A');
  });
});

describe('formatDate', () => {
  test('formats valid date string correctly', () => {
    expect(formatDate('2025-04-24')).toBe('April 24, 2025');
  });

  test('handles invalid date string', () => {
    expect(formatDate('invalid-date')).toBe('Invalid Date');
  });
});

describe('generateCardTopBar', () => {
  test('generates top bar with valid inputs', () => {
    const result = generateCardTopBar('Champion', 'us');
    expect(result.title).toBe('Champion');
    expect(result.flagUrl).toBe('https://flagcdn.com/w320/us.png');
  });

  test('uses placeholder flag when country code is missing', () => {
    const result = generateCardTopBar('Champion', '');
    expect(result.flagUrl).toBe('assets/images/placeholder-flag.png');
  });
});
