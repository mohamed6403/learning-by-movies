import { describe, expect, it } from 'vitest';
import { matchTranslations, overlap, suggestOffset } from './matching';

const c = (start: number, end: number, text = '') => ({ start, end, text });

describe('overlap', () => {
  it('measures the shared time', () => {
    expect(overlap(c(0, 4), c(2, 6))).toBe(2);
    expect(overlap(c(0, 2), c(3, 4))).toBe(0);
    expect(overlap(c(0, 10), c(2, 3))).toBe(1);
  });
});

describe('matchTranslations', () => {
  const fr = [c(1, 3, 'Bonjour.'), c(4, 6, 'Comment ça va ?'), c(6, 8, 'Très bien.'), c(20, 22, 'Au revoir.')];

  it('picks the line with the biggest overlap', () => {
    const [m] = matchTranslations([c(1.2, 3.2)], fr);
    expect(m.text).toBe('Bonjour.');
    expect(m.lines).toEqual([0]);
    expect(m.coverage).toBeCloseTo(0.9);
  });

  it('merges several lines that overlap strongly, in time order', () => {
    const [m] = matchTranslations([c(4, 8)], fr);
    expect(m.text).toBe('Comment ça va ? Très bien.');
    expect(m.lines).toEqual([1, 2]);
    expect(m.coverage).toBe(1);
  });

  it('ignores a weak neighbour overlap', () => {
    // English 4.0–6.3 overlaps "Très bien." by 0.3 s only (15 % of it, 13 % of English).
    const [m] = matchTranslations([c(4, 6.3)], fr);
    expect(m.text).toBe('Comment ça va ?');
  });

  it('returns an empty match when nothing overlaps', () => {
    expect(matchTranslations([c(10, 12)], fr)[0]).toEqual({ text: '', lines: [], coverage: 0 });
  });

  it('applies the offset to translation times', () => {
    // Translation is 10 s late; offset -10 brings "Au revoir." (20–22) to 10–12.
    expect(matchTranslations([c(10, 12)], fr, -10)[0].text).toBe('Au revoir.');
    expect(matchTranslations([c(11, 13)], fr, 10)[0].text).toBe('Bonjour.');
  });

  it('gives the same long translation line to both English lines it covers', () => {
    const tr = [c(0, 6, 'Une longue phrase.')];
    const res = matchTranslations([c(0, 3), c(3, 6)], tr);
    expect(res.map((r) => r.text)).toEqual(['Une longue phrase.', 'Une longue phrase.']);
  });

  it('keeps dialogue lines on separate lines and drops duplicates', () => {
    const tr = [c(0, 2, '- Salut.'), c(2, 4, '- Salut.'), c(2, 4, '- Ça va ?')];
    expect(matchTranslations([c(0, 4)], tr)[0].text).toBe('- Salut.\n- Ça va ?');
  });

  it('finds lines that start long before the English line (binary search window)', () => {
    const tr = [c(0, 30, 'Long.'), ...Array.from({ length: 50 }, (_, i) => c(31 + i, 31.5 + i, `n${i}`))];
    expect(matchTranslations([c(25, 28)], tr)[0].text).toBe('Long.');
  });
});

describe('suggestOffset', () => {
  it('finds the shift that best aligns two files', () => {
    const en = Array.from({ length: 20 }, (_, i) => c(i * 5, i * 5 + 2));
    const tr = en.map((e) => c(e.start + 2.5, e.end + 2.5, 'x'));
    expect(suggestOffset(en, tr)).toBe(-2.5);
  });
});
