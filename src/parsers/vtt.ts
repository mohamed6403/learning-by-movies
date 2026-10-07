import { cleanCues } from './postprocess';
import { parseArrowBlocks } from './srt';
import type { Cue } from './types';

export function parseVtt(content: string): Cue[] {
  const normalized = content.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  // NOTE / STYLE / REGION blocks have no "-->" line, so parseArrowBlocks skips them.
  // The WEBVTT header block is skipped the same way.
  return cleanCues(parseArrowBlocks(normalized));
}
