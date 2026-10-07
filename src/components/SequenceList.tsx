import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { editBack } from '../db/actions';
import { backText, type CardRecord, type Title } from '../db/schema';
import type { Sequence } from '../services/sequences';
import { State } from '../services/srs';
import { formatRange, formatTime } from '../utils/format';
import { BackEditor } from './BackEditor';

interface Props {
  title: Title;
  sequences: Sequence<CardRecord>[];
  /** Extra controls per card (e.g. play clip). */
  cardActions?: (card: CardRecord) => ReactNode;
}

const STATE_DOT: Record<State, string> = {
  [State.New]: 'bg-slate-300 dark:bg-slate-600',
  [State.Learning]: 'bg-amber-400',
  [State.Relearning]: 'bg-amber-400',
  [State.Review]: 'bg-emerald-500',
};

export function SequenceList({ title, sequences, cardActions }: Props) {
  const [open, setOpen] = useState<Set<number>>(() => new Set());
  const toggle = (i: number) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <ul className="flex flex-col gap-2">
      {sequences.map((seq) => {
        const learned = seq.items.filter((c) => c.state === State.Review).length;
        const isOpen = open.has(seq.index);
        return (
          <li key={seq.index} className="panel overflow-hidden">
            <div className="flex items-center gap-2 p-3">
              <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => toggle(seq.index)} aria-expanded={isOpen}>
                <span className={`text-xs transition ${isOpen ? 'rotate-90' : ''}`}>▶</span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">Sequence {seq.index + 1}</span>
                  <span className="muted block font-mono text-xs">
                    {formatRange(seq.start, seq.end)} · {seq.items.length} cards · {learned} learned
                  </span>
                </span>
              </button>
              <Link to={`/review?title=${title.id}&seq=${seq.index}`} className="btn btn-sm shrink-0">
                Study
              </Link>
            </div>
            {isOpen && (
              <ul className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
                {seq.items.map((card) => (
                  <CardRow key={card.id} card={card} title={title} actions={cardActions?.(card)} />
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function CardRow({ card, title, actions }: { card: CardRecord; title: Title; actions?: ReactNode }) {
  const [editing, setEditing] = useState(false);
  const back = backText(card);
  return (
    <li className="flex flex-col gap-1.5 p-3 text-sm whitespace-pre-line">
      <div className="flex items-start gap-2">
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${STATE_DOT[card.state]}`} title={State[card.state]} />
        <div className="min-w-0 flex-1">
          <div className="muted font-mono text-xs">{formatTime(card.start)}</div>
          <div lang="en" className="font-medium">
            {card.front}
          </div>
        </div>
        {actions}
      </div>
      <div className="pl-4">
        {editing ? (
          <BackEditor
            initial={back}
            autoText={card.back}
            lang={title.lang}
            onCancel={() => setEditing(false)}
            onSave={async (text) => {
              await editBack(card, text);
              setEditing(false);
            }}
          />
        ) : (
          <button type="button" className="group flex w-full items-start gap-2 text-left" onClick={() => setEditing(true)} title="Edit translation">
            {back ? (
              <span lang={title.lang} dir={title.lang === 'ar' ? 'rtl' : 'ltr'} className="flex-1 text-slate-600 dark:text-slate-300">
                {back}
              </span>
            ) : (
              <span className="muted flex-1 italic">No translation found</span>
            )}
            {card.backEdited && <span className="chip">edited</span>}
            <span className="muted opacity-0 transition group-hover:opacity-100">✎</span>
          </button>
        )}
      </div>
    </li>
  );
}
