import { formatDate } from '../utils';

describe('formatDate', () => {
  test('formats YYYY-MM-DD correctly', () => {
    expect(formatDate('2025-04-24')).toBe('2025-04-24');
  });

  test('returns "Invalid Date" for bad input', () => {
    expect(formatDate('not-a-date')).toBe('Invalid Date');
  });

  test('returns "Invalid Date" for empty string', () => {
    expect(formatDate('')).toBe('Invalid Date');
  });

  test('returns "Invalid Date" for null', () => {
    expect(formatDate(null)).toBe('Invalid Date');
  });

  test('returns "Invalid Date" for undefined', () => {
    expect(formatDate(undefined)).toBe('Invalid Date');
  });

  test('formats leap year date correctly', () => {
    expect(formatDate('2024-02-29')).toBe('2024-02-29');
  });

  test('returns already formatted date unchanged', () => {
    expect(formatDate('2025-04-24')).toBe('2025-04-24');
  });
});