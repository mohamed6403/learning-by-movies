import { State } from 'ts-fsrs';
import type { SrsFields } from '../db/schema';
import { dayKey, isDueToday } from './srs';

/** Number of consecutive days with at least one review, ending today (or yesterday if not yet studied today). */
export function computeStreak(days: Iterable<string>, now = new Date()): number {
  const set = new Set(days);
  const cursor = new Date(now);
  if (!set.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (set.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export interface Progress {
  total: number;
  /** Never studied. */
  fresh: number;
  /** In (re)learning steps. */
  learning: number;
  /** Graduated to the review state. */
  learned: number;
  dueToday: number;
}

export function computeProgress(cards: SrsFields[], now = new Date()): Progress {
  const p: Progress = { total: cards.length, fresh: 0, learning: 0, learned: 0, dueToday: 0 };
  for (const c of cards) {
    if (c.state === State.New) p.fresh++;
    else if (c.state === State.Review) p.learned++;
    else p.learning++;
    if (isDueToday(c, now)) p.dueToday++;
  }
  return p;
}
