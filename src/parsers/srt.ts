import { cleanCues } from './postprocess';
import { ARROW_LINE, parseTimestamp } from './time';
import type { Cue } from './types';

/** Parse cue blocks shared by SRT and VTT: optional id, `start --> end`, text lines. */
export function parseArrowBlocks(content: string): Cue[] {
  const cues: Cue[] = [];
  const blocks = content.replace(/\r\n?/g, '\n').split(/\n[ \t]*\n/);
  for (const block of blocks) {
    const lines = block.split('\n');
    // The timing line is the first or second line of the block (after an optional id).
    const timingIndex = lines.slice(0, 3).findIndex((l) => l.includes('-->'));
    if (timingIndex < 0) continue;
    const m = lines[timingIndex].match(ARROW_LINE);
    if (!m) continue;
    const start = parseTimestamp(m[1]);
    const end = parseTimestamp(m[2]);
    if (Number.isNaN(start) || Number.isNaN(end)) continue;
    cues.push({ start, end, text: lines.slice(timingIndex + 1).join('\n') });
  }
  return cues;
}

export function parseSrt(content: string): Cue[] {
  return cleanCues(parseArrowBlocks(content.replace(/^﻿/, '')));
}
