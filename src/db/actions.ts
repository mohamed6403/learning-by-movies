import type { Cue } from '../parsers/types';
import { buildCardDrafts } from '../services/cards';
import { matchTranslations } from '../services/matching';
import { dayKey, grade, newSrsFields, State, type Grade } from '../services/srs';
import { db, type CardRecord, type Title } from './schema';

export type NewTitle = Omit<Title, 'id' | 'createdAt'>;

export async function createTitle(title: NewTitle, english: Cue[], translation: Cue[]): Promise<number> {
  const drafts = buildCardDrafts(english, translation, title.offset);
  const now = new Date();
  return db.transaction('rw', db.titles, db.cards, db.translations, async () => {
    const titleId = await db.titles.add({ ...title, createdAt: now });
    await db.translations.bulkAdd(translation.map((t, index) => ({ ...t, index, titleId })));
    await db.cards.bulkAdd(drafts.map((d) => ({ ...d, ...newSrsFields(now), titleId })));
    return titleId;
  });
}

export async function updateTitle(id: number, patch: Partial<Omit<Title, 'id'>>): Promise<void> {
  await db.titles.update(id, patch);
}

export async function deleteTitle(id: number): Promise<void> {
  await db.transaction('rw', [db.titles, db.cards, db.translations, db.reviews], async () => {
    await db.cards.where('titleId').equals(id).delete();
    await db.translations.where('titleId').equals(id).delete();
    await db.reviews.where('titleId').equals(id).delete();
    await db.titles.delete(id);
  });
}

export async function getTranslationCues(titleId: number): Promise<Cue[]> {
  const rows = await db.translations.where('titleId').equals(titleId).sortBy('index');
  return rows.map(({ start, end, text }) => ({ start, end, text }));
}

export async function getTitleCards(titleId: number): Promise<CardRecord[]> {
  return db.cards.where('[titleId+index]').between([titleId, -Infinity], [titleId, Infinity]).toArray();
}

/** Save a new offset and re-match every card. Manual edits are kept. */
export async function applyOffset(titleId: number, offset: number): Promise<void> {
  const [cards, translation] = await Promise.all([getTitleCards(titleId), getTranslationCues(titleId)]);
  const matches = matchTranslations(cards, translation, offset);
  await db.transaction('rw', db.titles, db.cards, async () => {
    await db.titles.update(titleId, { offset });
    await db.cards.bulkUpdate(cards.map((c, i) => ({ key: c.id, changes: { back: matches[i].text } })));
  });
}

/** Set the manual back text. An empty or identical value goes back to the automatic match. */
export async function editBack(card: CardRecord, text: string): Promise<void> {
  const value = text.trim();
  await db.cards.update(card.id, { backEdited: value && value !== card.back ? value : undefined });
}

export async function answerCard(card: CardRecord, rating: Grade, now = new Date()): Promise<CardRecord> {
  const fields = grade(card, rating, now);
  const updated = { ...card, ...fields };
  await db.transaction('rw', db.cards, db.reviews, async () => {
    await db.cards.put(updated);
    await db.reviews.add({
      cardId: card.id,
      titleId: card.titleId,
      rating,
      wasNew: card.state === State.New,
      reviewedAt: now,
      day: dayKey(now),
    });
  });
  return updated;
}

export async function newCardsSeenToday(now = new Date()): Promise<number> {
  return db.reviews
    .where('day')
    .equals(dayKey(now))
    .filter((r) => r.wasNew)
    .count();
}

export async function resetTitleProgress(titleId: number): Promise<void> {
  const now = new Date();
  await db.transaction('rw', db.cards, db.reviews, async () => {
    await db.cards.where('titleId').equals(titleId).modify(newSrsFields(now));
    await db.reviews.where('titleId').equals(titleId).delete();
  });
}

// ---------- backup ----------

const DATE_KEYS = new Set(['due', 'last_review', 'createdAt', 'reviewedAt']);

export async function exportBackup(): Promise<string> {
  const [titles, translations, cards, reviews, settings] = await Promise.all([
    db.titles.toArray(),
    db.translations.toArray(),
    db.cards.toArray(),
    db.reviews.toArray(),
    db.settings.toArray(),
  ]);
  return JSON.stringify({ app: 'subcards', version: 1, titles, translations, cards, reviews, settings });
}

export async function importBackup(json: string): Promise<void> {
  const data = JSON.parse(json, (key, value) => (DATE_KEYS.has(key) && typeof value === 'string' ? new Date(value) : value));
  if (data?.app !== 'subcards') throw new Error('This file is not a SubCards backup.');
  await db.transaction('rw', [db.titles, db.translations, db.cards, db.reviews, db.settings], async () => {
    await Promise.all([db.titles.clear(), db.translations.clear(), db.cards.clear(), db.reviews.clear(), db.settings.clear()]);
    await db.titles.bulkAdd(data.titles);
    await db.translations.bulkAdd(data.translations);
    await db.cards.bulkAdd(data.cards);
    await db.reviews.bulkAdd(data.reviews);
    await db.settings.bulkAdd(data.settings);
  });
}
