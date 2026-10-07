# SubCards

Learn English from the subtitles of movies, series and anime.

Upload two subtitle files for the same title: the **English** one and a **translation** in Arabic or
French. Every English sentence becomes a flashcard. The front shows the English sentence and the back
shows the matching translation, found by time. Cards are scheduled with the FSRS spaced-repetition
algorithm.

No AI, no backend, no login. Everything stays in your browser (IndexedDB), and the app installs on
your phone as a PWA and works offline.

## Features

- **Subtitles**: `.srt`, `.vtt`, `.ass` / `.ssa`. Text is cleaned: HTML tags, ASS codes, music symbols,
  `[sound effects]`, `(LAUGHS)`, SDH speaker labels, and ASS sign or song styles are removed.
- **Encoding detection**: UTF-8 / UTF-16 (with or without a BOM), Windows-1256 (Arabic) and
  Windows-1252 (French). The import page shows a preview, and you can override the encoding if the
  characters look wrong.
- **Sentences**: a sentence split across two or three subtitle lines is merged into one card.
- **Sequences**: lines are grouped into scenes whenever the silence between them is longer than *N*
  seconds (default 4, change it in Settings). Each sequence shows its time range.
- **Matching by time**: each English line takes the translation line it overlaps most. Other lines
  that overlap strongly are merged in.
  - A **time offset** per title (+/- seconds), with a live preview of the matches and a match rate.
  - **Auto-sync** finds the offset that matches the most lines.
  - When nothing matches, the back says *No translation found*. You can edit the back of any card,
    and your edits are kept when the offset changes.
- **Flashcards**: flip animation, timestamp on the front, right-to-left Arabic on the back.
  Shortcuts: `Space` flips the card, `0` / `1` / `2` / `3` answer **Again / Hard / OK / Easy**, and
  `P` plays the clip.
- **Spaced repetition**: [FSRS](https://github.com/open-spaced-repetition/ts-fsrs). The daily review
  shows *Cards due today* plus new cards up to a daily limit. You can study a single sequence, or
  practise all its cards.
- **Video sync (optional)**: select a local video file and each card gets a ▶ button that plays the
  clip from its start time to its end time. You can also turn on auto-play when a card is shown. The
  video is played through an object URL and never uploaded or copied.
- **Progress**: cards learned, streak, cards due, a 30-day history, and progress per title.
- Dark and light themes, mobile-first layout, and a JSON backup to export or import.

## Run it

Requirements: Node.js 20+.

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

```bash
npm test           # unit tests (Vitest)
npm run typecheck  # TypeScript
npm run build      # production build in dist/ (includes the service worker)
npm run preview    # serve the production build
```

To try the app straight away, use the demo files in [`samples/`](samples). `demo.en.srt` is the
English file. `demo.ar.srt` (Windows-1256) and `demo.fr.vtt` are translations that are 1.5 s late on
purpose, so you can test the offset tool or *Auto-sync*.

## Install on your phone

The app is a static site, so you can host `dist/` anywhere (GitHub Pages, Netlify, or any static
server). It uses relative paths and hash routing, so it also works from a sub-folder. Open it on your
phone, then:

- **Android / Chrome**: menu → *Install app*.
- **iPhone / Safari**: Share → *Add to Home Screen*.

The service worker caches the app so it works offline. When a new version is deployed, a banner
offers the update; it never reloads the page in the middle of a review.

> Your data lives in the browser storage of the device you use. Use **Settings → Export backup** to
> move it to another device. Browsers can't remember a video file between sessions, so pick the
> video again after reopening the app (the app shows the last file name as a reminder).

## How it works

```
src/
  parsers/     srt.ts, vtt.ts, ass.ts, clean.ts, encoding.ts, time.ts (+ tests)
  services/    sequences.ts  – sentence merging + sequence splitting
               matching.ts   – overlap matching, offset, auto-sync
               cards.ts      – English cues -> sentence cards with translation
               srs.ts        – FSRS wrapper, daily queue
               stats.ts      – streak and progress
  db/          schema.ts (Dexie), actions.ts, settings.ts
  components/  Flashcard, ClipPlayer, OffsetTuner, SequenceList, ...
  pages/       Library, Import, Title, Review, Progress, Settings
  hooks/       theme, per-session video object URLs
```

See [`docs/PLAN.md`](docs/PLAN.md) for the data model and the details of each algorithm.

### Matching rules

For each English line, the translation times are shifted by the offset first. Then, for each
translation line, the app measures how long the two lines overlap.

1. The translation line with the **largest overlap** wins.
2. Every other line whose overlap covers **≥ 50 %** of itself or of the English line is merged in,
   in time order.
3. An overlap below **15 %** of both lines is ignored. If nothing is left, the back says
   *No translation found*.

## Tech

React 19, TypeScript, Vite, Tailwind CSS 4, Dexie (IndexedDB), ts-fsrs, vite-plugin-pwa, Vitest.
