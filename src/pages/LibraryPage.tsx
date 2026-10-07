import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { ProgressBar } from '../components/ProgressBar';
import { newCardsSeenToday } from '../db/actions';
import { db, type Title } from '../db/schema';
import { getSettings } from '../db/settings';
import { computeProgress, type Progress } from '../services/stats';
import { episodeLabel } from '../utils/format';

const TYPE_LABEL: Record<Title['type'], string> = { movie: 'Movie', series: 'Series', anime: 'Anime' };

async function loadLibrary() {
  const [titles, cards, settings, seen] = await Promise.all([
    db.titles.orderBy('createdAt').reverse().toArray(),
    db.cards.toArray(),
    getSettings(),
    newCardsSeenToday(),
  ]);
  const byTitle = new Map<number, typeof cards>();
  for (const c of cards) {
    const list = byTitle.get(c.titleId) ?? [];
    list.push(c);
    byTitle.set(c.titleId, list);
  }
  const now = new Date();
  const total = computeProgress(cards, now);
  return {
    newToday: Math.min(total.fresh, Math.max(0, settings.newPerDay - seen)),
    total,
    titles: titles.map((t) => ({ title: t, progress: computeProgress(byTitle.get(t.id) ?? [], now) })),
  };
}

export function LibraryPage() {
  const data = useLiveQuery(loadLibrary, []);
  if (!data) return null;

  if (data.titles.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="h-16 w-16" />
        <h1 className="text-2xl font-semibold">Learn English with subtitles</h1>
        <p className="muted max-w-sm">
          Add a movie, series or anime with its English subtitles and a translation in Arabic or French. Every English
          sentence becomes a flashcard.
        </p>
        <Link to="/import" className="btn btn-primary">
          + Add your first title
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="panel flex items-center justify-between gap-4 p-4">
        <div>
          <div className="text-3xl font-semibold">{data.total.dueToday + data.newToday}</div>
          <div className="muted text-sm">
            cards due today · {data.total.dueToday} to review, {data.newToday} new
          </div>
        </div>
        <Link to="/review" className="btn btn-primary shrink-0 whitespace-nowrap">
          Start review
        </Link>
      </section>

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">My titles</h1>
        <Link to="/import" className="btn btn-sm">
          + Add title
        </Link>
      </div>

      <ul className="flex flex-col gap-3">
        {data.titles.map(({ title, progress }) => (
          <li key={title.id}>
            <TitleRow title={title} progress={progress} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function TitleRow({ title, progress }: { title: Title; progress: Progress }) {
  const ep = episodeLabel(title.season, title.episode);
  const pct = progress.total ? Math.round((progress.learned / progress.total) * 100) : 0;
  return (
    <Link to={`/title/${title.id}`} className="panel block p-4 transition hover:border-indigo-400 dark:hover:border-indigo-500">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-medium">{title.name}</div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="chip">{TYPE_LABEL[title.type]}</span>
            {ep && <span className="chip font-mono">{ep}</span>}
            <span className="chip">EN → {title.lang.toUpperCase()}</span>
          </div>
        </div>
        {progress.dueToday > 0 && (
          <span className="shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            {progress.dueToday} due
          </span>
        )}
      </div>
      <ProgressBar className="mt-3" value={progress.learned} secondary={progress.learning} max={progress.total} />
      <div className="muted mt-1.5 flex justify-between text-xs">
        <span>
          {progress.learned} learned · {progress.learning} learning · {progress.fresh} new
        </span>
        <span>{pct}%</span>
      </div>
    </Link>
  );
}
