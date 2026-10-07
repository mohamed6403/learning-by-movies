import { useEffect, useState } from 'react';
import { decodeBytes, ENCODINGS, parseSubtitle, SUPPORTED_EXTENSIONS, type Cue, type LanguageHint, type SubtitleEncoding } from '../parsers';
import { formatTime } from '../utils/format';

export interface ParsedFile {
  name: string;
  cues: Cue[];
  encoding: SubtitleEncoding;
}

interface Props {
  label: string;
  hint: LanguageHint;
  onChange: (file: ParsedFile | null) => void;
}

const ENCODING_LABEL: Record<SubtitleEncoding, string> = {
  'utf-8': 'UTF-8',
  'windows-1256': 'Windows-1256 (Arabic)',
  'windows-1252': 'Windows-1252 (Western / French)',
  'utf-16le': 'UTF-16 LE',
  'utf-16be': 'UTF-16 BE',
};

/** Pick a subtitle file, detect its encoding, parse it and show a preview. */
export function SubtitleFileInput({ label, hint, onChange }: Props) {
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array } | null>(null);
  const [forced, setForced] = useState<SubtitleEncoding | undefined>();
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!file) {
      setParsed(null);
      onChange(null);
      return;
    }
    try {
      const { text, encoding } = decodeBytes(file.bytes, hint, forced);
      const cues = parseSubtitle(file.name, text);
      if (cues.length === 0) throw new Error('No subtitles found in this file.');
      const result = { name: file.name, cues, encoding };
      setParsed(result);
      setError('');
      onChange(result);
    } catch (e) {
      setParsed(null);
      setError(e instanceof Error ? e.message : String(e));
      onChange(null);
    }
    // onChange is a setter from the parent; re-running on its identity is not needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, forced, hint]);

  return (
    <div className="panel flex flex-col gap-3 p-4">
      <label className="label">{label}</label>
      <input
        type="file"
        accept={SUPPORTED_EXTENSIONS.join(',')}
        className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-indigo-700 dark:file:bg-indigo-950 dark:file:text-indigo-300"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          setForced(undefined);
          setFile(f ? { name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) } : null);
        }}
      />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {parsed && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="chip">{parsed.cues.length} lines</span>
            <label className="muted flex items-center gap-1.5 text-xs">
              Encoding
              <select
                className="input w-auto py-1 text-xs"
                value={parsed.encoding}
                onChange={(e) => setForced(e.target.value as SubtitleEncoding)}
              >
                {ENCODINGS.map((enc) => (
                  <option key={enc} value={enc}>
                    {ENCODING_LABEL[enc]}
                    {!forced && enc === parsed.encoding ? ' — detected' : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <ul className="flex flex-col gap-1 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-950">
            {parsed.cues.slice(0, 4).map((c, i) => (
              <li key={i} className="flex gap-2">
                <span className="muted shrink-0 font-mono text-xs leading-5">{formatTime(c.start)}</span>
                <span lang={hint} dir={hint === 'ar' ? 'rtl' : 'ltr'} className="flex-1 truncate">
                  {c.text}
                </span>
              </li>
            ))}
          </ul>
          <p className="muted text-xs">Characters look broken? Pick another encoding above.</p>
        </>
      )}
    </div>
  );
}
