# SubCards — plan & data model

## Principles

- **Local-first.** No backend, no login, no AI. Everything lives in IndexedDB (Dexie).
  Video files never leave the device: they are played through `URL.createObjectURL`.
- **Pure core, thin UI.** Parsing, cleaning, encoding detection, sequence splitting,
  time matching and scheduling are pure TypeScript functions with unit tests.
  React pages only call them and persist the results.

## Folder structure

```
src/
  parsers/     srt.ts, vtt.ts, ass.ts, clean.ts, encoding.ts, index.ts (+ tests)
  services/    sequences.ts, matching.ts, srs.ts, stats.ts, importTitle.ts (+ tests)
  db/          schema.ts (Dexie database + types), settings.ts
  components/  Flashcard, ClipPlayer, OffsetTuner, ProgressBar, Layout, ...
  pages/       Library, Import, TitleDetail, Review, Stats, Settings
  hooks/       useVideo (per-session video object URLs), useTheme
  utils/       time formatting, text direction
```

## Data model (IndexedDB via Dexie)

```ts
type TitleType = 'movie' | 'series' | 'anime';
type TranslationLang = 'ar' | 'fr';

interface Title {
  id?: number;
  name: string;
  type: TitleType;
  season?: number;          // series / anime only
  episode?: number;         // series / anime only
  lang: TranslationLang;    // language of the translation file
  offset: number;           // seconds added to translation times (+/-)
  englishFile: string;      // original file names, for display
  translationFile: string;
  videoName?: string;       // last video picked (the file itself is never stored)
  createdAt: Date;
}

// Cleaned cues of the translation file. Kept so cards can be re-matched
// when the offset changes.
interface TranslationLine {
  id?: number;
  titleId: number;
  index: number;
  start: number;            // seconds
  end: number;
  text: string;
}

// One English sentence = one card. FSRS state is stored inline.
interface CardRecord {
  id?: number;
  titleId: number;
  index: number;            // order in the English file
  start: number;            // seconds (English file = video timeline)
  end: number;
  front: string;            // English sentence
  back: string;             // auto-matched translation ('' = none found)
  backEdited?: string;      // manual edit — wins over `back`, survives re-matching
  // FSRS (ts-fsrs Card)
  due: Date; stability: number; difficulty: number; elapsed_days: number;
  scheduled_days: number; learning_steps: number; reps: number; lapses: number;
  state: State;             // New / Learning / Review / Relearning
  last_review?: Date;
}

interface ReviewLogRecord {
  id?: number;
  cardId: number;
  titleId: number;
  rating: Rating;           // Again / Hard / Good(OK) / Easy
  reviewedAt: Date;
  day: string;              // 'YYYY-MM-DD' local — used for streaks
}

interface Setting { key: string; value: unknown }   // gapSeconds, newPerDay, autoPlay, theme
```

Indexes: `titles: ++id, createdAt` · `translations: ++id, titleId` ·
`cards: ++id, titleId, due, state, [titleId+index]` · `reviews: ++id, cardId, titleId, day`.

**Sequences are derived, not stored**: `splitIntoSequences(cards, gapSeconds)` runs on the
sorted cards of a title, so changing the gap in Settings re-splits everything instantly.

## Algorithms

- **Encoding**: BOM → UTF-8/UTF-16; else strict UTF-8 decode; if that fails, choose
  Windows-1256 vs Windows-1252 from the share of high bytes (Arabic text is mostly high
  bytes, French only a few accented letters), using the expected language as a tie-break.
  The user can override the detected encoding on the import page.
- **Cleaning**: strip HTML tags, ASS override blocks `{\...}`, `\N` / `\h`, music symbols,
  `[sound]` / `(sound)` cues, speaker-less empty lines; collapse whitespace.
- **Sentences**: a cue that ends without terminal punctuation and is followed (< 1.5 s) by
  a cue starting in lowercase / with `...` is merged with it, so one card = one sentence.
- **Sequences**: new sequence when `next.start - prev.end > gapSeconds` (default 4).
- **Matching**: translation cue times are shifted by `offset`. For each English card,
  overlap = `min(ends) - max(starts)`. The best overlap wins; every other cue that overlaps
  *strongly* (≥ 50 % of its own duration, or ≥ 50 % of the English line) is merged in
  time order. Tiny overlaps (< 15 % of both cues) are ignored → "No translation found".
- **SRS**: ts-fsrs. Buttons Again (0) / Hard (1) / OK (2) / Easy (3). Due queue = due
  learning/review cards + new cards up to a daily limit. Optional filter: one sequence.

## Build steps

1. Parsers (srt / vtt / ass), cleaning, encoding detection + tests
2. Sequence splitting + tests
3. Time matching + offset (live preview) + tests
4. Flashcards UI (library, import, title page, flip card, edit back, RTL)
5. Spaced repetition (FSRS), daily review, stats & streak
6. Video sync (clip player, autoplay option)
7. PWA (manifest, icons, offline service worker)
