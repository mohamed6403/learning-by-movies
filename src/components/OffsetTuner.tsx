import { useMemo, useState } from 'react';
import { applyOffset } from '../db/actions';
import { backText, type CardRecord, type Title } from '../db/schema';
import type { Cue } from '../parsers';
import { matchTranslations, suggestOffset } from '../services/matching';
import type { Sequence } from '../services/sequences';
import { formatOffset, formatTime } from '../utils/format';

interface Props {
  title: Title;
  cards: CardRecord[];
  translation: Cue[];
  sequences: Sequence<CardRecord>[];
}

const clamp = (n: number) => Math.max(-600, Math.min(600, Math.round(n * 10) / 10));

/** Adjust the time offset of the translation file with a live preview of the matches. */
export function OffsetTuner({ title, cards, translation, sequences }: Props) {
  const [offset, setOffset] = useState(title.offset);
  const [seqIndex, setSeqIndex] = useState(() => Math.max(0, sequences.findIndex((s) => s.items.length >= 3)));
  const [saving, setSaving] = useState(false);

  const matches = useMemo(() => matchTranslations(cards, translation, offset), [cards, translation, offset]);
  const matched = matches.filter((m) => m.text).length;
  const pct = cards.length ? Math.round((matched / cards.length) * 100) : 0;
  const position = useMemo(() => new Map(cards.map((c, i) => [c.id, i])), [cards]);

  const seq = sequences[Math.min(seqIndex, sequences.length - 1)];
  const dirty = offset !== title.offset;

  const save = async () => {
    setSaving(true);
    await applyOffset(title.id, offset);
    setSaving(false);
  };

  return (
    <section className="panel flex flex-col gap-4 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">Sync the translation</h2>
        <span className={`text-sm font-medium ${pct >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
          {matched}/{cards.length} matched · {pct}%
        </span>
      </div>
      <p className="muted -mt-2 text-sm">
        If translations appear too early or too late, move them in time. Positive = later. Manual edits are kept.
      </p>

      <div className="flex items-center gap-2">
        <button type="button" className="btn btn-sm" onClick={() => setOffset((o) => clamp(o - 1))} aria-label="Minus 1 second">
          −1
        </button>
        <button type="button" className="btn btn-sm" onClick={() => setOffset((o) => clamp(o - 0.1))} aria-label="Minus 0.1 second">
          −.1
        </button>
        <input
          type="range"
          min={-30}
          max={30}
          step={0.1}
          value={Math.max(-30, Math.min(30, offset))}
          onChange={(e) => setOffset(clamp(Number(e.target.value)))}
          className="flex-1 accent-indigo-600"
          aria-label="Offset in seconds"
        />
        <button type="button" className="btn btn-sm" onClick={() => setOffset((o) => clamp(o + 0.1))} aria-label="Plus 0.1 second">
          +.1
        </button>
        <button type="button" className="btn btn-sm" onClick={() => setOffset((o) => clamp(o + 1))} aria-label="Plus 1 second">
          +1
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          Offset
          <input
            type="number"
            step={0.1}
            className="input w-24 py-1 font-mono"
            value={offset}
            onChange={(e) => setOffset(clamp(Number(e.target.value) || 0))}
          />
          s
        </label>
        <button type="button" className="btn btn-sm" onClick={() => setOffset(suggestOffset(cards, translation, 30, 0.1))}>
          Auto-sync
        </button>
        {dirty && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOffset(title.offset)}>
            Undo ({formatOffset(title.offset)})
          </button>
        )}
        <button type="button" className="btn btn-primary btn-sm ml-auto" disabled={!dirty || saving} onClick={save}>
          {saving ? 'Saving…' : dirty ? `Apply ${formatOffset(offset)}` : 'Saved'}
        </button>
      </div>

      {seq && (
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm">
            <span className="muted">Preview</span>
            <select className="input w-auto flex-1 py-1 text-sm" value={seq.index} onChange={(e) => setSeqIndex(Number(e.target.value))}>
              {sequences.map((s) => (
                <option key={s.index} value={s.index}>
                  Sequence {s.index + 1} · {formatTime(s.start, false)} · {s.items.length} lines
                </option>
              ))}
            </select>
          </label>
          <ul className="flex max-h-80 flex-col divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-100 dark:divide-slate-800 dark:border-slate-800">
            {seq.items.map((card) => {
              const m = matches[position.get(card.id)!];
              return (
                <li key={card.id} className="grid gap-1 p-2.5 text-sm whitespace-pre-line">
                  <div className="flex gap-2">
                    <span className="muted shrink-0 font-mono text-xs leading-5">{formatTime(card.start)}</span>
                    <span lang="en">{card.front}</span>
                  </div>
                  {card.backEdited ? (
                    <div lang={title.lang} dir={title.lang === 'ar' ? 'rtl' : 'ltr'} className="text-indigo-700 dark:text-indigo-300">
                      {backText(card)} <span className="chip">edited</span>
                    </div>
                  ) : m.text ? (
                    <div lang={title.lang} dir={title.lang === 'ar' ? 'rtl' : 'ltr'} className="text-emerald-700 dark:text-emerald-400">
                      {m.text}
                    </div>
                  ) : (
                    <div className="text-xs text-red-600 italic dark:text-red-400">No translation found</div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
