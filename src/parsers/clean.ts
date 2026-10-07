const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
  '&lrm;': '',
  '&rlm;': '',
};

const MUSIC_SYMBOLS = /[♪♫♬♩🎵🎶]/gu;
// Bidi control characters often sprinkled in Arabic subtitles; direction is handled by CSS.
const BIDI_CONTROLS = /[‎‏‪-‮⁦-⁩﻿]/g;
// "[door slams]", "[MUSIC]" — always a sound description.
const SQUARE_BRACKETS = /\[[^\]]*\]/g;
// "(LAUGHS)", "(sighs)" — parentheses that only hold a sound description.
// We drop them when they are upper case or a single short lower-case word.
const SOUND_PARENS = /\((?:[^()a-z]*[A-Z][^()a-z]*|[a-z]+(?:\s[a-z]+)?)\)/g;
// "JOHN: Hello" / "MAN 2: Hi" — SDH speaker labels in capitals.
const SPEAKER_LABEL = /^(-\s*)?[A-Z][A-Z0-9 .'’-]{1,24}:\s+/;

/**
 * Clean one cue's text:
 * HTML tags, ASS override codes, music symbols, sound effects and speaker labels are removed.
 * Lines of the same speaker are joined with a space; dialogue lines ("- Hi") keep a newline.
 * Returns '' when nothing readable is left.
 */
export function cleanText(raw: string): string {
  let text = raw
    .replace(/\\N|\\n/g, '\n') // ASS hard / soft line breaks
    .replace(/\\h/g, ' ') // ASS hard space
    .replace(/\{[^}]*\}/g, '') // ASS override blocks {\i1}, {\an8}
    .replace(/<[^>]*>/g, '') // HTML / VTT tags <i>, <font>, <v Bob>, <00:01.000>
    .replace(/&[a-z]+;|&#\d+;/gi, (e) => ENTITIES[e.toLowerCase()] ?? e)
    .replace(BIDI_CONTROLS, '')
    .replace(MUSIC_SYMBOLS, '')
    .replace(SQUARE_BRACKETS, '')
    .replace(SOUND_PARENS, '');

  const lines = text
    .split('\n')
    .map((line) => line.replace(SPEAKER_LABEL, '$1').replace(/\s+/g, ' ').trim())
    // A line reduced to a dash, '#' or punctuation was only a sound effect.
    .filter((line) => line && !/^[-#*.,:;!?\s]*$/.test(line));

  text = '';
  for (const line of lines) {
    if (!text) text = line;
    else text += (line.startsWith('-') ? '\n' : ' ') + line;
  }
  return text.trim();
}
