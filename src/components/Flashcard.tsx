import { useState, type ReactNode } from 'react';
import type { TranslationLang } from '../db/schema';
import { formatTime } from '../utils/format';
import { BackEditor } from './BackEditor';

interface Props {
  front: string;
  back: string;
  /** Automatic match, used by the editor's "restore" button. */
  autoBack: string;
  start: number;
  end: number;
  lang: TranslationLang;
  flipped: boolean;
  onFlip: () => void;
  onEditBack: (text: string) => void;
  /** Small caption under the card (title / sequence). */
  caption?: ReactNode;
  /** Extra controls on the front, e.g. the clip play button. */
  actions?: ReactNode;
  /** Notified so keyboard shortcuts can pause while typing. */
  onEditingChange?: (editing: boolean) => void;
}

export function Flashcard(props: Props) {
  const { front, back, autoBack, start, end, lang, flipped, onFlip, onEditBack, caption, actions, onEditingChange } = props;
  const [editing, setEditingState] = useState(false);
  const setEditing = (v: boolean) => {
    setEditingState(v);
    onEditingChange?.(v);
  };

  const face =
    'flip-face panel flex min-h-64 cursor-pointer flex-col items-center justify-center gap-4 p-6 text-center shadow-sm sm:min-h-72 sm:p-10';

  return (
    <div className="flip-scene select-none">
      <div className={`flip-inner ${flipped ? 'is-flipped' : ''}`}>
        {/* Front */}
        <div
          className={`${face} ${flipped ? 'pointer-events-none' : ''}`}
          onClick={onFlip}
          role="button"
          tabIndex={flipped ? -1 : 0}
          aria-hidden={flipped}
          aria-label="Show translation"
        >
          <span className="chip font-mono">
            {formatTime(start)} → {formatTime(end)}
          </span>
          <p lang="en" className="text-2xl leading-snug font-medium whitespace-pre-line sm:text-3xl">
            {front}
          </p>
          {actions && (
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              {actions}
            </div>
          )}
          <span className="muted text-xs">Tap or press Space to flip</span>
        </div>

        {/* Back */}
        <div className={`${face} flip-back ${flipped ? '' : 'pointer-events-none'}`} onClick={editing ? undefined : onFlip} aria-hidden={!flipped}>
          <p lang="en" className="muted text-base leading-snug whitespace-pre-line">
            {front}
          </p>
          <hr className="w-16 border-slate-200 dark:border-slate-700" />
          {editing ? (
            <BackEditor
              initial={back}
              autoText={autoBack}
              lang={lang}
              onCancel={() => setEditing(false)}
              onSave={(text) => {
                onEditBack(text);
                setEditing(false);
              }}
            />
          ) : (
            <>
              {back ? (
                <p
                  lang={lang}
                  dir={lang === 'ar' ? 'rtl' : 'ltr'}
                  className={`leading-relaxed whitespace-pre-line ${lang === 'ar' ? 'text-3xl' : 'text-2xl'}`}
                >
                  {back}
                </p>
              ) : (
                <p className="muted text-lg italic">No translation found</p>
              )}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditing(true);
                }}
              >
                ✎ {back ? 'Edit translation' : 'Add translation'}
              </button>
            </>
          )}
        </div>
      </div>
      {caption && <div className="muted mt-2 text-center text-xs">{caption}</div>}
    </div>
  );
}
