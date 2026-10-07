import { describe, expect, it } from 'vitest';
import { buildQueue, dayKey, formatInterval, grade, newSrsFields, previewIntervals, Rating, State } from './srs';
import { computeProgress, computeStreak } from './stats';

const now = new Date(2026, 9, 7, 10, 0, 0);

describe('srs', () => {
  it('creates new cards due now', () => {
    const f = newSrsFields(now);
    expect(f.state).toBe(State.New);
    expect(f.reps).toBe(0);
    expect(f.due).toEqual(now);
  });

  it('schedules Easy further than OK, and OK further than Hard', () => {
    const f = newSrsFields(now);
    const hard = grade(f, Rating.Hard, now).due.getTime();
    const ok = grade(f, Rating.Good, now).due.getTime();
    const easy = grade(f, Rating.Easy, now).due.getTime();
    expect(hard).toBeLessThanOrEqual(ok);
    expect(ok).toBeLessThan(easy);
    expect(grade(f, Rating.Good, now).reps).toBe(1);
    expect(grade(f, Rating.Good, now).last_review).toEqual(now);
  });

  it('previews intervals for every answer', () => {
    const p = previewIntervals(newSrsFields(now), now);
    expect(Object.keys(p).map(Number).sort()).toEqual([1, 2, 3, 4]);
    expect(p[Rating.Again]).toMatch(/^\d+m$/);
  });

  it('formats intervals', () => {
    expect(formatInterval(30_000)).toBe('1m');
    expect(formatInterval(10 * 60_000)).toBe('10m');
    expect(formatInterval(5 * 3600_000)).toBe('5h');
    expect(formatInterval(3 * 86400_000)).toBe('3d');
    expect(formatInterval(90 * 86400_000)).toBe('3mo');
  });

  it('builds the queue: due cards first (most overdue first), then new cards up to the limit', () => {
    const base = { titleId: 1 };
    const mk = (index: number, state: State, due: Date) => ({ ...newSrsFields(now), ...base, index, state, due });
    const tomorrow = new Date(2026, 9, 8, 9);
    const cards = [
      mk(0, State.New, now),
      mk(1, State.Review, new Date(2026, 9, 7, 20)), // later today -> due today
      mk(2, State.Review, new Date(2026, 9, 1)), // overdue
      mk(3, State.Review, tomorrow),
      mk(4, State.New, now),
      mk(5, State.New, now),
    ];
    expect(buildQueue(cards, 2, now).map((c) => c.index)).toEqual([2, 1, 0, 4]);
    expect(buildQueue(cards, 0, now).map((c) => c.index)).toEqual([2, 1]);
  });
});

describe('stats', () => {
  it('computes the streak ending today or yesterday', () => {
    expect(computeStreak([], now)).toBe(0);
    expect(computeStreak(['2026-10-07', '2026-10-06', '2026-10-05', '2026-10-03'], now)).toBe(3);
    expect(computeStreak(['2026-10-06', '2026-10-05'], now)).toBe(2);
    expect(computeStreak(['2026-10-04'], now)).toBe(0);
  });

  it('uses local calendar days', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('counts card states', () => {
    const f = newSrsFields(now);
    const learning = grade(f, Rating.Good, now);
    const learned = { ...f, state: State.Review, due: new Date(2026, 9, 20) };
    expect(computeProgress([f, learning, learned], now)).toEqual({
      total: 3,
      fresh: 1,
      learning: 1,
      learned: 1,
      dueToday: 1,
    });
  });
});
