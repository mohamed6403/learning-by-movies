import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { ProgressBar } from '../components/ProgressBar';
import { db } from '../db/schema';
import { dayKey } from '../services/srs';
import { computeProgress, computeStreak } from '../services/stats';

const DAYS = 30;

async function loadStats() {
  const [cards, reviews, titles] = await Promise.all([db.cards.toArray(), db.reviews.toArray(), db.titles.toArray()]);
  const perDay = new Map<string, number>();
  for (const r of reviews) perDay.set(r.day, (perDay.get(r.day) ?? 0) + 1);

  const now = new Date();
  const history = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (DAYS - 1 - i));
    const key = dayKey(d);
    return { key, count: perDay.get(key) ?? 0 };
  });

  return {
    progress: computeProgress(cards, now),
    streak: computeStreak(perDay.keys(), now),
    today: perDay.get(dayKey(now)) ?? 0,
    totalReviews: reviews.length,
    history,
    titles: titles.map((t) => ({ title: t, progress: computeProgress(cards.filter((c) => c.titleId === t.id), now) })),
  };
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="panel p-4">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="muted text-xs">{label}</div>
    </div>
  );
}

export function StatsPage() {
  const s = useLiveQuery(loadStats, []);
  if (!s) return null;
  const max = Math.max(1, ...s.history.map((h) => h.count));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Progress</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat value={`${s.streak} 🔥`} label={s.streak === 1 ? 'day streak' : 'days streak'} />
        <Stat value={s.progress.learned} label="cards learned" />
        <Stat value={s.progress.dueToday} label="cards due today" />
        <Stat value={s.today} label="reviews today" />
      </div>

      <section className="panel p-4">
        <div className="mb-3 flex justify-between text-sm">
          <span className="font-medium">Last {DAYS} days</span>
          <span className="muted">{s.totalReviews} reviews in total</span>
        </div>
        <div className="flex h-24 items-end gap-[3px]">
          {s.history.map((h) => (
            <div
              key={h.key}
              title={`${h.key}: ${h.count} reviews`}
              className={`flex-1 rounded-sm ${h.count ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-800'}`}
              style={{ height: `${Math.max(4, (h.count / max) * 100)}%` }}
            />
          ))}
        </div>
      </section>

      <section className="panel p-4">
        <div className="mb-2 text-sm font-medium">All cards</div>
        <ProgressBar value={s.progress.learned} secondary={s.progress.learning} max={s.progress.total} />
        <div className="muted mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span>
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> {s.progress.learned} learned
          </span>
          <span>
            <span className="inline-block h-2 w-2 rounded-full bg-amber-400" /> {s.progress.learning} learning
          </span>
          <span>
            <span className="inline-block h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" /> {s.progress.fresh} new
          </span>
        </div>
      </section>

      {s.titles.length > 0 && (
        <section className="panel divide-y divide-slate-100 dark:divide-slate-800">
          {s.titles.map(({ title, progress }) => (
            <Link key={title.id} to={`/title/${title.id}`} className="block p-4">
              <div className="mb-2 flex justify-between text-sm">
                <span className="truncate font-medium">{title.name}</span>
                <span className="muted shrink-0">
                  {progress.learned}/{progress.total}
                </span>
              </div>
              <ProgressBar value={progress.learned} secondary={progress.learning} max={progress.total} />
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
