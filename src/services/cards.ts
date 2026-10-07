import type { Cue } from '../parsers/types';
import { matchTranslations } from './matching';
import { mergeIntoSentences } from './sequences';

export interface CardDraft {
  index: number;
  start: number;
  end: number;
  front: string;
  back: string;
}

/** English cues -> sentences -> cards with their matched translation. */
export function buildCardDrafts(english: Cue[], translation: Cue[], offset: number): CardDraft[] {
  const sentences = mergeIntoSentences(english);
  const matches = matchTranslations(sentences, translation, offset);
  return sentences.map((s, index) => ({
    index,
    start: s.start,
    end: s.end,
    front: s.text,
    back: matches[index].text,
  }));
}
