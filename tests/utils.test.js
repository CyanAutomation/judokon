import { getFlagUrl, generateCardSignatureMove } from '../utils.js';

describe('getFlagUrl', () => {
  it('returns correct URL for valid country code', () => {
    expect(getFlagUrl('JP')).toBe('https://flagcdn.com/w320/jp.png');
  });

  it('returns placeholder for missing code', () => {
    expect(getFlagUrl(null)).toMatch(/placeholder/);
  });
});

describe('generateCardSignatureMove', () => {
  const gokyo = [{ id: 'uchi-mata', name: 'Uchi Mata' }];
  const judoka = { signatureMoveId: 'uchi-mata' };

  it('returns HTML with technique name', () => {
    const html = generateCardSignatureMove(judoka, gokyo);
    expect(html).toContain('Uchi Mata');
  });

  it('returns "Unknown" for unmatched ID', () => {
    const html = generateCardSignatureMove({ signatureMoveId: 'nonexistent' }, gokyo);
    expect(html).toContain('Unknown');
  });
});