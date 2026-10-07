import type { Cue } from '../parsers/types';

export interface Timed {
  start: number;
  end: number;
}

export interface Sequence<T extends Timed> {
  /** 0-based position of the sequence in the title. */
  index: number;
  start: number;
  end: number;
  items: T[];
}

export const DEFAULT_GAP_SECONDS = 4;

/**
 * Group time-sorted items into sequences (scenes):
 * a new sequence starts when the silence between two items is bigger than `gapSeconds`.
 */
export function splitIntoSequences<T extends Timed>(items: T[], gapSeconds = DEFAULT_GAP_SECONDS): Sequence<T>[] {
  const sequences: Sequence<T>[] = [];
  let current: Sequence<T> | undefined;
  let lastEnd = -Infinity;

  for (const item of items) {
    if (!current || item.start - lastEnd > gapSeconds) {
      current = { index: sequences.length, start: item.start, end: item.end, items: [] };
      sequences.push(current);
    }
    current.items.push(item);
    lastEnd = Math.max(lastEnd, item.end);
    current.end = lastEnd;
  }
  return sequences;
}

const ENDS_SENTENCE = /[.!?…"'»”)\]]$|[.!?…]["'»”]?$|[؟!.]$/;
const MAX_JOIN_GAP = 1.5;
const MAX_PARTS = 3;

/** True when `next` reads as the continuation of the unfinished sentence in `prev`. */
function continues(prev: Cue, next: Cue): boolean {
  if (next.start - prev.end > MAX_JOIN_GAP) return false;
  if (prev.text.includes('\n') || next.text.startsWith('-')) return false; // dialogue between speakers
  if (prev.text.endsWith('...') || prev.text.endsWith('…')) {
    return next.text.startsWith('...') || next.text.startsWith('…') || /^[a-z]/.test(next.text);
  }
  if (ENDS_SENTENCE.test(prev.text)) return false;
  // "I wanted to tell you," + "that I'm leaving." / "I think" + "we should go."
  return /^[a-z]/.test(next.text) || /[,;:]$/.test(prev.text) || /^(I|I'm|I'll|I've|I'd)\b/.test(next.text);
}

/**
 * Turn subtitle cues into sentences: a sentence split across consecutive cues
 * ("I think that" / "we should go.") is merged into one item covering both time ranges.
 */
export function mergeIntoSentences(cues: Cue[]): Cue[] {
  const out: Cue[] = [];
  let parts = 0;
  for (const cue of cues) {
    const prev = out[out.length - 1];
    if (prev && parts < MAX_PARTS && continues(prev, cue)) {
      // "If you want..." + "...we can leave." -> "If you want... we can leave."
      const nextText = /[.…]$/.test(prev.text) ? cue.text.replace(/^(\.\.\.|…)\s*/, '') : cue.text;
      prev.text = `${prev.text} ${nextText}`;
      prev.end = Math.max(prev.end, cue.end);
      parts++;
    } else {
      out.push({ ...cue });
      parts = 1;
    }
  }
  return out;
}
