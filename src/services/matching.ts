import type { Cue } from '../parsers/types';
import type { Timed } from './sequences';

export interface Match {
  /** Merged translation text, '' when nothing matches. */
  text: string;
  /** Indexes (in the translation array) of the lines used. */
  lines: number[];
  /** Share of the English line covered by the chosen translation lines, 0..1. */
  coverage: number;
}

/** A translation line must cover this share of itself or of the English line to be merged in. */
export const STRONG_OVERLAP = 0.5;
/** Below this share of both lines, an overlap is just a rounding accident. */
export const MIN_OVERLAP = 0.15;

const duration = (c: Timed) => Math.max(c.end - c.start, 0.001);

export function overlap(a: Timed, b: Timed): number {
  return Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start));
}

function joinTexts(texts: string[]): string {
  const unique = texts.filter((t, i) => texts.indexOf(t) === i);
  return unique.reduce((acc, t) => (acc ? acc + (t.startsWith('-') ? '\n' : ' ') + t : t), '');
}

/**
 * Find the translation of every English line by time overlap.
 * Translation times are shifted by `offset` seconds (positive = translation appears later).
 *
 * The best-overlapping translation line is chosen; other lines that overlap strongly
 * (≥ 50 % of themselves or of the English line) are merged with it in time order.
 * `translations` must be sorted by start time.
 */
export function matchTranslations(english: Timed[], translations: Cue[], offset = 0): Match[] {
  const maxDuration = translations.reduce((m, t) => Math.max(m, t.end - t.start), 0);
  const starts = translations.map((t) => t.start + offset);

  return english.map((en) => {
    // First translation line that could still overlap: start >= en.start - maxDuration.
    let lo = 0;
    let hi = starts.length;
    const from = en.start - maxDuration;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (starts[mid] < from) lo = mid + 1;
      else hi = mid;
    }

    const enDur = duration(en);
    const candidates: { i: number; amount: number; strong: boolean }[] = [];
    for (let i = lo; i < translations.length && starts[i] < en.end; i++) {
      const t = translations[i];
      const shifted = { start: starts[i], end: t.end + offset };
      const amount = overlap(en, shifted);
      if (amount <= 0) continue;
      const ofTranslation = amount / duration(shifted);
      const ofEnglish = amount / enDur;
      if (ofTranslation < MIN_OVERLAP && ofEnglish < MIN_OVERLAP) continue;
      candidates.push({ i, amount, strong: ofTranslation >= STRONG_OVERLAP || ofEnglish >= STRONG_OVERLAP });
    }
    if (candidates.length === 0) return { text: '', lines: [], coverage: 0 };

    const best = candidates.reduce((a, b) => (b.amount > a.amount ? b : a));
    const chosen = candidates.filter((c) => c === best || c.strong);
    const lines = chosen.map((c) => c.i);
    const covered = chosen.reduce((sum, c) => sum + c.amount, 0);
    return {
      text: joinTexts(lines.map((i) => translations[i].text)),
      lines,
      coverage: Math.min(1, covered / enDur),
    };
  });
}

/**
 * Suggest an offset by trying values in [-range, +range] and keeping the one where
 * the English lines are best covered. Handy as a starting point for the offset slider.
 */
export function suggestOffset(english: Timed[], translations: Cue[], range = 10, step = 0.25): number {
  // Sample the English lines to keep this fast on long titles.
  const sample = english.length > 300 ? english.filter((_, i) => i % Math.ceil(english.length / 300) === 0) : english;
  let bestOffset = 0;
  let bestScore = -1;
  for (let k = -Math.round(range / step); k <= Math.round(range / step); k++) {
    const offset = Math.round(k * step * 100) / 100;
    const score = matchTranslations(sample, translations, offset).reduce((s, m) => s + m.coverage, 0);
    // Prefer the smallest shift on ties.
    if (score > bestScore + 1e-9 || (Math.abs(score - bestScore) < 1e-9 && Math.abs(offset) < Math.abs(bestOffset))) {
      bestScore = score;
      bestOffset = offset;
    }
  }
  return bestOffset;
}
