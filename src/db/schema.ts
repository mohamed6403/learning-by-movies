import Dexie, { type EntityTable } from 'dexie';
import type { Rating, State } from 'ts-fsrs';

export type TitleType = 'movie' | 'series' | 'anime';
export type TranslationLang = 'ar' | 'fr';

export interface Title {
  id: number;
  name: string;
  type: TitleType;
  season?: number;
  episode?: number;
  /** Language of the translation file. */
  lang: TranslationLang;
  /** Seconds added to every translation time before matching (+ = later). */
  offset: number;
  englishFile: string;
  translationFile: string;
  /** Name of the last video file picked; the file itself is never stored. */
  videoName?: string;
  createdAt: Date;
}

/** A cleaned cue of the translation file, kept so cards can be re-matched. */
export interface TranslationLine {
  id: number;
  titleId: number;
  index: number;
  start: number;
  end: number;
  text: string;
}

export interface SrsFields {
  due: Date;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: State;
  last_review?: Date;
}

/** One English sentence = one flashcard. */
export interface CardRecord extends SrsFields {
  id: number;
  titleId: number;
  /** Position in the English file. */
  index: number;
  start: number;
  end: number;
  front: string;
  /** Automatically matched translation, '' when none was found. */
  back: string;
  /** Manual edit of the back; wins over `back` and survives re-matching. */
  backEdited?: string;
}

export interface ReviewRecord {
  id: number;
  cardId: number;
  titleId: number;
  rating: Rating;
  /** The card was new before this review (counts against the daily new-card limit). */
  wasNew: boolean;
  reviewedAt: Date;
  /** Local day, 'YYYY-MM-DD'. */
  day: string;
}

export interface SettingRow {
  key: string;
  value: unknown;
}

export const db = new Dexie('subcards') as Dexie & {
  titles: EntityTable<Title, 'id'>;
  translations: EntityTable<TranslationLine, 'id'>;
  cards: EntityTable<CardRecord, 'id'>;
  reviews: EntityTable<ReviewRecord, 'id'>;
  settings: EntityTable<SettingRow, 'key'>;
};

db.version(1).stores({
  titles: '++id, createdAt',
  translations: '++id, titleId',
  cards: '++id, titleId, due, state, [titleId+index]',
  reviews: '++id, cardId, titleId, day',
  settings: 'key',
});

/** Text shown on the back of a card. */
export const backText = (card: Pick<CardRecord, 'back' | 'backEdited'>) => card.backEdited ?? card.back;
