import { cleanText } from './clean';
import type { Cue } from './types';

const round = (n: number) => Math.round(n * 1000) / 1000;

/** Clean every cue, drop empty ones, sort by time and remove exact duplicates. */
export function cleanCues(cues: Cue[]): Cue[] {
  const cleaned = cues
    .map((c) => ({ start: round(c.start), end: round(Math.max(c.end, c.start)), text: cleanText(c.text) }))
    .filter((c) => c.text.length > 0)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const out: Cue[] = [];
  for (const cue of cleaned) {
    const prev = out[out.length - 1];
    // ASS files often repeat a line on several layers; some SRTs repeat cues.
    if (prev && prev.text === cue.text && cue.start - prev.end <= 0.05) {
      prev.end = Math.max(prev.end, cue.end);
      continue;
    }
    out.push(cue);
  }
  return out;
}
