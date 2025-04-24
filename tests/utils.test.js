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
  test('should format a valid date string as "YYYY-MM-DD"', () => {
    expect(formatDate('2025-04-24')).toBe('2025-04-24');
  });

  test('should return "Invalid Date" for an invalid date string', () => {
    expect(formatDate('invalid-date')).toBe('Invalid Date');
  });

  test('should return accented or Unicode characters in strings', () => {
    expect(getValue('René')).toBe('René');
    expect(getValue('Özlem')).toBe('Özlem');
    expect(getValue('Łukasz')).toBe('Łukasz');
  });
  
  test('should fallback when string is only whitespace (including Unicode spaces)', () => {
    expect(getValue('   ')).toBe('Unknown');
    expect(getValue('\u2003\u2003')).toBe('Unknown'); // em space
  });

  test('should format date consistently for non-ambiguous ISO strings', () => {
    expect(formatDate('2025-12-01')).toBe('2025-12-01');
    expect(formatDate('1999-07-15')).toBe('1999-07-15');
  });
  
  test('should treat invalid formats correctly', () => {
    expect(formatDate('15-07-1999')).toBe('Invalid Date'); // UK-style but invalid to Date()
    expect(formatDate('')).toBe('Invalid Date');
    expect(formatDate(null)).toBe('Invalid Date');
  });
});

describe('generateCardTopBar', () => {
  test('should generate top bar object with correct title and flag URL for valid inputs', () => {
    const judoka = {
      firstname: 'Clarisse',
      surname: 'Agbegnenou',
      country: 'fr',
    };
    const flag = 'https://flagcdn.com/w320/fr.png';

    const result = generateCardTopBar(judoka, flag);

    expect(result.title).toBe('Clarisse Agbegnenou');
    expect(result.flagUrl).toBe(flag);
    expect(result.html).toContain('<div class="card-top-bar">');
    expect(result.html).toContain('Clarisse');
    expect(result.html).toContain('Agbegnenou');
    expect(result.html).toContain(flag);
  });

  test('should return fallback HTML and data when judoka is missing', () => {
    const result = generateCardTopBar(null, null);

    expect(result.title).toBe('No data');
    expect(result.flagUrl).toBe('assets/images/placeholder-flag.png');
    expect(result.html).toContain('No data available');
  });

  test('should use placeholder flag URL when flag URL is null or empty', () => {
    const judoka = {
      firstname: 'Champion',
      surname: 'McStrong',
      country: 'xx'
    };
    const result = generateCardTopBar(judoka, null);
  
    expect(result.flagUrl).toBe('assets/images/placeholder-flag.png');
  });

  test('should still build HTML if country is missing', () => {
    const judoka = {
      firstname: 'Champion',
      surname: 'NoCountry',
      country: ''
    };
    const result = generateCardTopBar(judoka, null);
  
    expect(result.flagUrl).toBe('assets/images/placeholder-flag.png');
    expect(result.html).toContain('alt="Unknown flag"');
  });
  
  test('should correctly handle names with accented characters and special punctuation', () => {
    const judoka = {
      firstname: 'Damián',
      surname: 'Szwarnowiecki-Júnior',
      country: 'pl'
    };
    const flag = 'https://flagcdn.com/w320/pl.png';
  
    const result = generateCardTopBar(judoka, flag);
  
    expect(result.title).toBe('Damián Szwarnowiecki-Júnior');
    expect(result.html).toContain('Damián');
    expect(result.html).toContain('Szwarnowiecki-Júnior');
    expect(result.html).toContain('pl.png');
  });
  
  test('should correctly encode special characters in country alt tag', () => {
    const judoka = {
      firstname: 'René',
      surname: 'Lucien',
      country: 'fr'
    };
    const flag = 'https://flagcdn.com/w320/fr.png';
  
    const result = generateCardTopBar(judoka, flag);
  
    // Should still render readable flag alt text with special characters intact
    expect(result.html).toContain('alt="fr flag"');
  });

  test('should escape HTML-sensitive characters in names and country', () => {
    const judoka = {
      firstname: '<Hacker>',
      surname: `"O'Neil"`,
      country: 'us<script>',
    };
    const result = generateCardTopBar(judoka, null);
  
    expect(result.html).toContain('&lt;Hacker&gt;');
    expect(result.html).toContain('&quot;O&#039;Neil&quot;');
    expect(result.html).toContain('alt="us&lt;script&gt; flag"');
  });
  
});
