import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ClipPlayer, type ClipPlayerHandle } from '../components/ClipPlayer';
import { OffsetTuner } from '../components/OffsetTuner';
import { ProgressBar } from '../components/ProgressBar';
import { SequenceList } from '../components/SequenceList';
import { VideoPicker } from '../components/VideoPicker';
import { deleteTitle, getTitleCards, getTranslationCues, resetTitleProgress } from '../db/actions';
import { db, type CardRecord } from '../db/schema';
import { useSettings } from '../db/settings';
import { useTitleVideo } from '../hooks/video';
import { splitIntoSequences } from '../services/sequences';
import { computeProgress } from '../services/stats';
import { episodeLabel, formatOffset } from '../utils/format';

export function TitlePage() {
  const id = Number(useParams().id);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { gapSeconds, clipPadding } = useSettings();
  const [showSync, setShowSync] = useState(params.has('new'));
  const { video } = useTitleVideo(id);
  const [clip, setClip] = useState<CardRecord | null>(null);
  const [playToken, setPlayToken] = useState(0);
  const player = useRef<ClipPlayerHandle>(null);

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

      <section className="panel flex flex-col gap-3 p-4">
        <VideoPicker titleId={title.id} lastName={title.videoName} />
        {video && (
          <ClipPlayer
            ref={player}
            src={video.url}
            start={(clip ?? cards[0])?.start ?? 0}
            end={(clip ?? cards[0])?.end ?? 0}
            padding={clipPadding}
            playToken={playToken}
          />
        )}
      </section>

      {showSync && <OffsetTuner title={title} cards={cards} translation={translation} sequences={sequences} />}

      <h2 className="mt-2 font-semibold">Sequences</h2>
      <SequenceList
        title={title}
        sequences={sequences}
        cardActions={
          video
            ? (card) => (
                <button
                  type="button"
                  className="btn btn-sm shrink-0"
                  aria-label="Play clip"
                  onClick={() => {
                    if (clip?.id === card.id) player.current?.play();
                    else {
                      setClip(card);
                      setPlayToken((t) => t + 1);
                    }
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  ▶
                </button>
              )
            : undefined
        }
      />

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
