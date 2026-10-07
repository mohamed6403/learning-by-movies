import { createEmptyCard, fsrs, Rating, State, type Card, type Grade } from 'ts-fsrs';
import type { SrsFields } from '../db/schema';

export { Rating, State };
export type { Grade };

const scheduler = fsrs({ enable_fuzz: true });

/** The four answer buttons. Keys: 0 = Again, 1 = Hard, 2 = OK, 3 = Easy. */
export const ANSWERS: { rating: Grade; label: string; key: string }[] = [
  { rating: Rating.Again, label: 'Again', key: '0' },
  { rating: Rating.Hard, label: 'Hard', key: '1' },
  { rating: Rating.Good, label: 'OK', key: '2' },
  { rating: Rating.Easy, label: 'Easy', key: '3' },
];

export function newSrsFields(now = new Date()): SrsFields {
  const { last_review: _unused, ...card } = createEmptyCard(now);
  return card;
}

function toCard(fields: SrsFields): Card {
  return {
    due: fields.due,
    stability: fields.stability,
    difficulty: fields.difficulty,
    elapsed_days: fields.elapsed_days,
    scheduled_days: fields.scheduled_days,
    learning_steps: fields.learning_steps,
    reps: fields.reps,
    lapses: fields.lapses,
    state: fields.state,
    last_review: fields.last_review,
  };
}

/** Apply an answer and return the new scheduling fields. */
export function grade(fields: SrsFields, rating: Grade, now = new Date()): SrsFields {
  const { card } = scheduler.next(toCard(fields), now, rating);
  return { ...card, last_review: card.last_review ?? now };
}

/** Human interval until the next review for each answer, e.g. { 1: '1m', 3: '10m', 4: '3d' }. */
export function previewIntervals(fields: SrsFields, now = new Date()): Record<Grade, string> {
  const preview = scheduler.repeat(toCard(fields), now);
  const out = {} as Record<Grade, string>;
  for (const { rating } of ANSWERS) out[rating] = formatInterval(preview[rating].card.due.getTime() - now.getTime());
  return out;
}

export function formatInterval(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 31) return `${days}d`;
  const months = days / 30;
  if (months < 12) return `${Math.round(months * 10) / 10}mo`;
  return `${Math.round((days / 365) * 10) / 10}y`;
}

export function endOfDay(now = new Date()): Date {
  const d = new Date(now);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Local calendar day as 'YYYY-MM-DD'. */
export function dayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const isDueToday = (c: SrsFields, now = new Date()) => c.state !== State.New && c.due <= endOfDay(now);

interface QueueItem extends SrsFields {
  titleId: number;
  index: number;
}

/**
 * Build today's queue: cards already in learning/review that are due today (most overdue first),
 * then new cards in film order, up to the remaining daily new-card allowance.
 */
export function buildQueue<T extends QueueItem>(cards: T[], newAllowance: number, now = new Date()): T[] {
  const due = cards.filter((c) => isDueToday(c, now)).sort((a, b) => a.due.getTime() - b.due.getTime());
  const fresh = cards
    .filter((c) => c.state === State.New)
    .sort((a, b) => a.titleId - b.titleId || a.index - b.index)
    .slice(0, Math.max(0, newAllowance));
  return [...due, ...fresh];
}

/** After an answer, should the card come back later in the same session? */
export function needsAnotherLook(fields: SrsFields, now = new Date()): boolean {
  return fields.due.getTime() - now.getTime() < 60 * 60 * 1000;
}
