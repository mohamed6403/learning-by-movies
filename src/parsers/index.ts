import { parseAss } from './ass';
import { parseSrt } from './srt';
import type { Cue, SubtitleFormat } from './types';
import { parseVtt } from './vtt';

export type { Cue, SubtitleFormat } from './types';
export { cleanText } from './clean';
export { decodeBytes, detectEncoding, ENCODINGS } from './encoding';
export type { LanguageHint, SubtitleEncoding } from './encoding';

export const SUPPORTED_EXTENSIONS = ['.srt', '.vtt', '.ass', '.ssa'];

export function detectFormat(fileName: string, content: string): SubtitleFormat {
  const ext = fileName.toLowerCase().split('.').pop();
  if (ext === 'srt') return 'srt';
  if (ext === 'vtt') return 'vtt';
  if (ext === 'ass' || ext === 'ssa') return 'ass';
  const head = content.slice(0, 500);
  if (/^﻿?WEBVTT/.test(head)) return 'vtt';
  if (/\[Script Info\]|\[Events\]/i.test(head)) return 'ass';
  return 'srt';
}

/** Parse and clean a subtitle file of any supported format. */
export function parseSubtitle(fileName: string, content: string): Cue[] {
  switch (detectFormat(fileName, content)) {
    case 'vtt':
      return parseVtt(content);
    case 'ass':
      return parseAss(content);
    default:
      return parseSrt(content);
  }
}
