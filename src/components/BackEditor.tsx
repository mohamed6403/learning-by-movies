import { useState } from 'react';
import type { TranslationLang } from '../db/schema';

interface Props {
  initial: string;
  autoText: string;
  lang: TranslationLang;
  onSave: (text: string) => void;
  onCancel: () => void;
}

/** Textarea to correct the translation of a card. Saving an empty text restores the automatic match. */
export function BackEditor({ initial, autoText, lang, onSave, onCancel }: Props) {
  const [text, setText] = useState(initial);
  return (
    <form
      className="flex w-full flex-col gap-2"
      onClick={(e) => e.stopPropagation()}
      onSubmit={(e) => {
        e.preventDefault();
        onSave(text);
      }}
    >
      <textarea
        className="input min-h-24 text-base"
        value={text}
        autoFocus
        lang={lang}
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel();
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSave(text);
        }}
        placeholder="Type the translation…"
      />
      <div className="flex flex-wrap justify-end gap-2">
        {autoText && text !== autoText && (
          <button type="button" className="btn btn-ghost btn-sm mr-auto" onClick={() => setText(autoText)}>
            Restore automatic match
          </button>
        )}
        <button type="button" className="btn btn-sm" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary btn-sm">
          Save
        </button>
      </div>
    </form>
  );
}
