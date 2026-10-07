import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SubtitleFileInput, type ParsedFile } from '../components/SubtitleFileInput';
import { createTitle } from '../db/actions';
import type { TitleType, TranslationLang } from '../db/schema';
import { guessTitleFromFileName } from '../utils/format';

export function ImportPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [type, setType] = useState<TitleType>('movie');
  const [season, setSeason] = useState('');
  const [episode, setEpisode] = useState('');
  const [lang, setLang] = useState<TranslationLang>('ar');
  const [english, setEnglish] = useState<ParsedFile | null>(null);
  const [translation, setTranslation] = useState<ParsedFile | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const hasEpisodes = type !== 'movie';

  const onEnglish = (file: ParsedFile | null) => {
    setEnglish(file);
    if (file && !name) {
      const guess = guessTitleFromFileName(file.name);
      setName(guess.name);
      if (guess.episode != null) {
        setType((t) => (t === 'movie' ? 'series' : t));
        setSeason(guess.season != null ? String(guess.season) : '');
        setEpisode(String(guess.episode));
      }
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!english || !translation) return;
    setSaving(true);
    setError('');
    try {
      const id = await createTitle(
        {
          name: name.trim() || english.name,
          type,
          season: hasEpisodes && season ? Number(season) : undefined,
          episode: hasEpisodes && episode ? Number(episode) : undefined,
          lang,
          offset: 0,
          englishFile: english.name,
          translationFile: translation.name,
        },
        english.cues,
        translation.cues,
      );
      navigate(`/title/${id}?new=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Add a title</h1>

      <SubtitleFileInput label="1 · English subtitles (.srt, .vtt, .ass)" hint="en" onChange={onEnglish} />

      <div className="panel flex flex-col gap-3 p-4">
        <span className="label">2 · Translation language</span>
        <div className="grid grid-cols-2 gap-2">
          {(['ar', 'fr'] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={`btn ${lang === l ? 'btn-primary' : ''}`}
              aria-pressed={lang === l}
            >
              {l === 'ar' ? 'العربية · Arabic' : 'Français · French'}
            </button>
          ))}
        </div>
      </div>

      <SubtitleFileInput label="3 · Translation subtitles" hint={lang} onChange={setTranslation} />

      <div className="panel grid grid-cols-2 gap-3 p-4">
        <div className="col-span-2">
          <label className="label" htmlFor="name">
            Title
          </label>
          <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Spirited Away" />
        </div>
        <div className="col-span-2">
          <span className="label">Type</span>
          <div className="grid grid-cols-3 gap-2">
            {(['movie', 'series', 'anime'] as const).map((t) => (
              <button key={t} type="button" onClick={() => setType(t)} className={`btn capitalize ${type === t ? 'btn-primary' : ''}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        {hasEpisodes && (
          <>
            <div>
              <label className="label" htmlFor="season">
                Season
              </label>
              <input id="season" className="input" type="number" min={0} inputMode="numeric" value={season} onChange={(e) => setSeason(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="episode">
                Episode
              </label>
              <input id="episode" className="input" type="number" min={0} inputMode="numeric" value={episode} onChange={(e) => setEpisode(e.target.value)} />
            </div>
          </>
        )}
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button type="submit" className="btn btn-primary py-3" disabled={!english || !translation || saving}>
        {saving ? 'Creating cards…' : 'Create flashcards'}
      </button>
      <p className="muted text-center text-xs">You can fix the timing offset between the two files on the next screen.</p>
    </form>
  );
}
