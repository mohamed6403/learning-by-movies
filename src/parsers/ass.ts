import { cleanCues } from './postprocess';
import { parseTimestamp } from './time';
import type { Cue } from './types';

const DEFAULT_FORMAT = ['Layer', 'Start', 'End', 'Style', 'Name', 'MarginL', 'MarginR', 'MarginV', 'Effect', 'Text'];
// Styles used for songs and on-screen signs in anime fansubs: not dialogue.
const NON_DIALOGUE_STYLE = /^(signs?|songs?|op|ed|kara(oke)?|title|typeset|lyrics?)\b/i;

/** Parse Advanced SubStation Alpha (.ass / .ssa) dialogue events. */
export function parseAss(content: string): Cue[] {
  const lines = content.replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
  let inEvents = false;
  let format = DEFAULT_FORMAT;
  const cues: Cue[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith('[')) {
      inEvents = line.toLowerCase() === '[events]';
      continue;
    }
    if (!inEvents) continue;

    if (/^format\s*:/i.test(line)) {
      format = line.slice(line.indexOf(':') + 1).split(',').map((f) => f.trim());
      continue;
    }
    if (!/^dialogue\s*:/i.test(line)) continue;

    // Text is the last field and may itself contain commas.
    const body = line.slice(line.indexOf(':') + 1).trimStart();
    const fields: string[] = [];
    let rest = body;
    for (let i = 0; i < format.length - 1; i++) {
      const comma = rest.indexOf(',');
      if (comma < 0) break;
      fields.push(rest.slice(0, comma));
      rest = rest.slice(comma + 1);
    }
    fields.push(rest);
    const get = (name: string) => fields[format.findIndex((f) => f.toLowerCase() === name.toLowerCase())] ?? '';

    const text = get('Text');
    if (/\\p[1-9]/.test(text)) continue; // vector drawing, not text
    if (NON_DIALOGUE_STYLE.test(get('Style').trim())) continue;

    const start = parseTimestamp(get('Start'));
    const end = parseTimestamp(get('End'));
    if (Number.isNaN(start) || Number.isNaN(end)) continue;
    cues.push({ start, end, text });
  }
  return cleanCues(cues);
}
