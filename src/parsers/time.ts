/**
 * Parse a subtitle timestamp into seconds.
 * Accepts `hh:mm:ss,mmm`, `hh:mm:ss.mmm`, `mm:ss.mmm` (VTT) and `h:mm:ss.cc` (ASS).
 * Returns NaN when the value is not a timestamp.
 */
export function parseTimestamp(value: string): number {
  const m = value.trim().match(/^(?:(\d+):)?(\d{1,2}):(\d{1,2})(?:[.,](\d+))?$/);
  if (!m) return NaN;
  const [, h, min, s, frac] = m;
  const fraction = frac ? Number(`0.${frac}`) : 0;
  return Number(h ?? 0) * 3600 + Number(min) * 60 + Number(s) + fraction;
}

/** Matches a `start --> end` line (SRT and VTT). Cue settings after the end time are ignored. */
export const ARROW_LINE = /^\s*(\S+)\s*-->\s*(\S+)/;
