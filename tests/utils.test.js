import { getValue, formatDate, generateCardTopBar } from './utils';

describe('getValue', () => {
  test('should return the value when it is a string', () => {
    expect(getValue('Hello')).toBe('Hello');
  });

  test('should return non-string values as-is unless nullish', () => {
    expect(getValue(42)).toBe(42);
    expect(getValue(false)).toBe(false);
  });

  test('should return the fallback when value is undefined', () => {
    expect(getValue(undefined, 'N/A')).toBe('N/A');
  });
});

describe('formatDate', () => {
  test('should format a valid date string as "Month Day, Year"', () => {
    expect(formatDate('2025-04-24')).toBe('2025-04-24');
  });

  test('should return "Invalid Date" for an invalid date string', () => {
    expect(formatDate('invalid-date')).toBe('Invalid Date');
  });
});

describe('generateCardTopBar', () => {
  test('should generate top bar with correct title and flag URL for valid inputs', () => {
    const result = generateCardTopBar('Champion', 'us');
    expect(result.title).toBe('Champion');
    expect(result.flagUrl).toBe('https://flagcdn.com/w320/us.png');
  });

  test('should use placeholder flag URL when country code is missing', () => {
    const result = generateCardTopBar('Champion', '');
    expect(result.flagUrl).toBe('assets/images/placeholder-flag.png');
  });
});