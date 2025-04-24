import { getValue } from '../utils';

describe('getValue', () => {
  test('returns the value if it is a non-empty string', () => {
    expect(getValue('Hello')).toBe('Hello');
  });

  test('returns the fallback if the value is an empty string', () => {
    expect(getValue('', 'Fallback')).toBe('Fallback');
  });

  test('returns the fallback if the value is undefined', () => {
    expect(getValue(undefined, 'Fallback')).toBe('Fallback');
  });

  test('returns the fallback if the value is null', () => {
    expect(getValue(null, 'Fallback')).toBe('Fallback');
  });

  test('returns the value if it is a non-string', () => {
    expect(getValue(42, 'Fallback')).toBe(42);
    expect(getValue(false, 'Fallback')).toBe(false);
  });
});