export type SubtitleEncoding = 'utf-8' | 'utf-16le' | 'utf-16be' | 'windows-1256' | 'windows-1252';
export type LanguageHint = 'en' | 'ar' | 'fr';

export const ENCODINGS: SubtitleEncoding[] = ['utf-8', 'windows-1256', 'windows-1252', 'utf-16le', 'utf-16be'];

/**
 * Guess the encoding of a subtitle file.
 * 1. Byte order mark.  2. Valid UTF-8.  3. Windows-1256 (Arabic) vs Windows-1252 (Western):
 * Arabic text is made almost only of high bytes, French has a few accented letters.
 */
export function detectEncoding(bytes: Uint8Array, hint?: LanguageHint): SubtitleEncoding {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return 'utf-8';
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return 'utf-16le';
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return 'utf-16be';

  try {
    new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return 'utf-8';
  } catch {
    // not UTF-8, keep looking
  }

  let ascii = 0;
  let high = 0;
  for (const b of bytes) {
    if ((b >= 0x41 && b <= 0x5a) || (b >= 0x61 && b <= 0x7a)) ascii++;
    else if (b >= 0xc0) high++; // letter range in both code pages
  }
  const ratio = high / Math.max(1, ascii + high);
  if (ratio > 0.3) return 'windows-1256';
  if (hint === 'ar' && ratio > 0.05) return 'windows-1256';
  return 'windows-1252';
}

export function decodeBytes(
  bytes: Uint8Array,
  hint?: LanguageHint,
  forced?: SubtitleEncoding,
): { text: string; encoding: SubtitleEncoding } {
  const encoding = forced ?? detectEncoding(bytes, hint);
  const text = new TextDecoder(encoding).decode(bytes).replace(/^﻿/, '');
  return { text, encoding };
}
