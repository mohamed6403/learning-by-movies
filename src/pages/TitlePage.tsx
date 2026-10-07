import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { OffsetTuner } from '../components/OffsetTuner';
import { ProgressBar } from '../components/ProgressBar';
import { SequenceList } from '../components/SequenceList';
import { deleteTitle, getTitleCards, getTranslationCues, resetTitleProgress } from '../db/actions';
import { db } from '../db/schema';
import { useSettings } from '../db/settings';
import { splitIntoSequences } from '../services/sequences';
import { computeProgress } from '../services/stats';
import { episodeLabel, formatOffset } from '../utils/format';

export function TitlePage() {
  const id = Number(useParams().id);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { gapSeconds } = useSettings();
  const [showSync, setShowSync] = useState(params.has('new'));

  // null = not found, undefined = still loading
  const title = useLiveQuery(async () => (await db.titles.get(id)) ?? null, [id]);
  const cards = useLiveQuery(() => getTitleCards(id), [id]);
  // Translation lines never change after import: load once.
  const translation = useLiveQuery(() => getTranslationCues(id), [id]);

  const sequences = useMemo(() => splitIntoSequences(cards ?? [], gapSeconds), [cards, gapSeconds]);
  const progress = useMemo(() => computeProgress(cards ?? []), [cards]);

  if (title === null) {
    return (
      <div className="py-16 text-center">
        <p className="muted">This title does not exist.</p>
        <Link to="/" className="btn mt-4">
          Back to library
        </Link>
      </div>
    );
  }
  if (!title || !cards || !translation) return null;

  const ep = episodeLabel(title.season, title.episode);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link to="/" className="muted text-sm">
          ← Library
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{title.name}</h1>
        <div className="mt-1 flex flex-wrap gap-1.5">
          <span className="chip capitalize">{title.type}</span>
          {ep && <span className="chip font-mono">{ep}</span>}
          <span className="chip">EN → {title.lang.toUpperCase()}</span>
          <span className="chip">offset {formatOffset(title.offset)}</span>
        </div>
      </div>

      <section className="panel flex flex-col gap-3 p-4">
        <ProgressBar value={progress.learned} secondary={progress.learning} max={progress.total} />
        <div className="muted flex flex-wrap justify-between gap-2 text-sm">
          <span>
            {progress.learned} learned · {progress.learning} learning · {progress.fresh} new
          </span>
          <span>
            {sequences.length} sequences · {cards.length} cards
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/review?title=${title.id}`} className="btn btn-primary">
            Study {progress.dueToday > 0 ? `(${progress.dueToday} due)` : ''}
          </Link>
          <button type="button" className={`btn ${showSync ? 'border-indigo-400' : ''}`} onClick={() => setShowSync((s) => !s)}>
            ⇄ Sync timing
          </button>
        </div>
      </section>

      {showSync && <OffsetTuner title={title} cards={cards} translation={translation} sequences={sequences} />}

      <h2 className="mt-2 font-semibold">Sequences</h2>
      <SequenceList title={title} sequences={sequences} />

      <section className="mt-6 flex flex-wrap gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <span className="muted w-full text-xs">
          Files: {title.englishFile} · {title.translationFile}
        </span>
        <button
          type="button"
          className="btn btn-sm"
          onClick={async () => {
            if (confirm('Reset the study progress of every card in this title?')) await resetTitleProgress(title.id);
          }}
        >
          Reset progress
        </button>
        <button
          type="button"
          className="btn btn-danger btn-sm"
          onClick={async () => {
            if (confirm(`Delete "${title.name}" and all its cards?`)) {
              await deleteTitle(title.id);
              navigate('/');
            }
          }}
        >
          Delete title
        </button>
      </section>
    </div>
  );
}
