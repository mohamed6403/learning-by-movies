import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnswerButtons } from '../components/AnswerButtons';
import { ClipPlayer, type ClipPlayerHandle } from '../components/ClipPlayer';
import { Flashcard } from '../components/Flashcard';
import { VideoPicker } from '../components/VideoPicker';
import { answerCard, editBack, getTitleCards, newCardsSeenToday } from '../db/actions';
import { backText, db, type CardRecord, type Title } from '../db/schema';
import { getSettings, useSettings } from '../db/settings';
import { useTitleVideo } from '../hooks/video';
import { splitIntoSequences } from '../services/sequences';
import { ANSWERS, buildQueue, isDueToday, needsAnotherLook, State, type Grade } from '../services/srs';
import { episodeLabel } from '../utils/format';

interface Session {
  queue: CardRecord[];
  titles: Map<number, Title>;
  /** Sequence number (1-based) of each card, for the caption. */
  seqOf: Map<number, number>;
  /** Size of the sequence when studying one sequence. */
  sequenceSize?: number;
}

async function loadSession(titleId: number | null, seqIndex: number | null, practice: boolean): Promise<Session> {
  const [titleList, settings, seen] = await Promise.all([db.titles.toArray(), getSettings(), newCardsSeenToday()]);
  const titles = new Map(titleList.map((t) => [t.id, t]));
  const ids = titleId != null ? [titleId] : titleList.map((t) => t.id);

  const seqOf = new Map<number, number>();
  const all: CardRecord[] = [];
  let sequenceCards: CardRecord[] | undefined;
  for (const id of ids) {
    const cards = await getTitleCards(id);
    for (const seq of splitIntoSequences(cards, settings.gapSeconds)) {
      for (const c of seq.items) seqOf.set(c.id, seq.index + 1);
      if (id === titleId && seq.index === seqIndex) sequenceCards = seq.items;
    }
    all.push(...cards);
  }

  if (seqIndex != null) {
    const cards = sequenceCards ?? [];
    // A chosen sequence: everything new or due in it, in film order (or every card when practising).
    const queue = practice ? cards : cards.filter((c) => c.state === State.New || isDueToday(c));
    return { queue, titles, seqOf, sequenceSize: cards.length };
  }
  return { queue: buildQueue(all, settings.newPerDay - seen), titles, seqOf };
}

export function ReviewPage() {
  const [params] = useSearchParams();
  const titleId = params.get('title') != null ? Number(params.get('title')) : null;
  const seqIndex = params.get('seq') != null ? Number(params.get('seq')) : null;
  const practice = params.get('mode') === 'practice';

  const [session, setSession] = useState<Session | null>(null);
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const editingRef = useRef(false);
  const player = useRef<ClipPlayerHandle>(null);
  const { autoPlay, clipPadding } = useSettings();

  useEffect(() => {
    let alive = true;
    setSession(null);
    setPos(0);
    setFlipped(false);
    setReviewed(0);
    loadSession(titleId, seqIndex, practice).then((s) => alive && setSession(s));
    return () => {
      alive = false;
    };
  }, [titleId, seqIndex, practice]);

  const card = session?.queue[pos];
  const title = card ? session?.titles.get(card.titleId) : undefined;
  const { video } = useTitleVideo(card?.titleId);

  const answer = useCallback(
    async (rating: Grade) => {
      if (!card || busy) return;
      setBusy(true);
      const updated = await answerCard(card, rating);
      setSession((s) => {
        if (!s) return s;
        // Cards still in short learning steps come back at the end of this session.
        const queue = needsAnotherLook(updated) ? [...s.queue, updated] : s.queue;
        return { ...s, queue };
      });
      setReviewed((n) => n + 1);
      setFlipped(false);
      setPos((p) => p + 1);
      setBusy(false);
    },
    [card, busy],
  );

  const saveBack = async (text: string) => {
    if (!card) return;
    await editBack(card, text);
    const fresh = await db.cards.get(card.id);
    if (fresh) setSession((s) => s && { ...s, queue: s.queue.map((c) => (c.id === fresh.id ? { ...c, backEdited: fresh.backEdited } : c)) });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editingRef.current || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, select')) return;
      if (e.key === ' ' || e.key === 'Enter') {
        if (target.closest('button, a') && e.key === 'Enter') return;
        e.preventDefault();
        setFlipped((f) => !f);
        return;
      }
      if (e.key === 'p' || e.key === 'P') {
        player.current?.play();
        return;
      }
      const a = ANSWERS.find((x) => x.key === e.key);
      if (a && flipped) {
        e.preventDefault();
        void answer(a.rating);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answer, flipped]);

  if (!session) return null;

  const scopeLabel =
    seqIndex != null && titleId != null
      ? `${session.titles.get(titleId)?.name ?? ''} · Sequence ${seqIndex + 1}`
      : titleId != null
        ? session.titles.get(titleId)?.name
        : 'All titles';
  const backLink = titleId != null ? `/title/${titleId}` : '/';

  if (!card) {
    const nothing = reviewed === 0;
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="text-5xl">{nothing ? '🌙' : '🎉'}</div>
        <h1 className="text-xl font-semibold">{nothing ? 'Nothing due right now' : 'Session complete!'}</h1>
        <p className="muted">
          {nothing ? `No cards due today in ${scopeLabel}.` : `You reviewed ${reviewed} card${reviewed > 1 ? 's' : ''}.`}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {seqIndex != null && titleId != null && !!session.sequenceSize && (
            <Link to={`/review?title=${titleId}&seq=${seqIndex}&mode=practice`} className="btn btn-primary">
              Practice all {session.sequenceSize} cards
            </Link>
          )}
          <Link to={backLink} className="btn">
            Back
          </Link>
        </div>
      </div>
    );
  }

  const remaining = session.queue.length - pos;
  const ep = title ? episodeLabel(title.season, title.episode) : '';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 text-sm">
        <Link to={backLink} className="muted">
          ← {scopeLabel}
          {practice ? ' · practice' : ''}
        </Link>
        <span className="chip">
          {remaining} left{card.state === State.New ? ' · new' : ''}
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div className="h-full bg-indigo-500 transition-all" style={{ width: `${(pos / session.queue.length) * 100}%` }} />
      </div>

      {video && (
        <ClipPlayer
          ref={player}
          src={video.url}
          start={card.start}
          end={card.end}
          padding={clipPadding}
          playToken={autoPlay ? pos + 1 : 0}
        />
      )}

      <Flashcard
        key={`${card.id}-${pos}`}
        front={card.front}
        back={backText(card)}
        autoBack={card.back}
        start={card.start}
        end={card.end}
        lang={title?.lang ?? 'fr'}
        flipped={flipped}
        onFlip={() => setFlipped((f) => !f)}
        onEditBack={saveBack}
        onEditingChange={(v) => (editingRef.current = v)}
        actions={
          video ? (
            <button type="button" className="btn btn-sm" onClick={() => player.current?.play()}>
              ▶ Play clip <kbd className="font-mono opacity-60">P</kbd>
            </button>
          ) : (
            <VideoPicker titleId={card.titleId} compact />
          )
        }
        caption={
          title && (
            <>
              {title.name}
              {ep && ` · ${ep}`} · Sequence {session.seqOf.get(card.id)}
            </>
          )
        }
      />

      {flipped ? (
        <AnswerButtons card={card} onAnswer={answer} disabled={busy} />
      ) : (
        <button type="button" className="btn btn-primary py-3" onClick={() => setFlipped(true)}>
          Show translation <kbd className="font-mono text-xs opacity-75">Space</kbd>
        </button>
      )}
      <p className="muted hidden text-center text-xs sm:block">
        Space = flip · 0 Again · 1 Hard · 2 OK · 3 Easy{video ? ' · P = play clip' : ''}
      </p>
    </div>
  );
}
