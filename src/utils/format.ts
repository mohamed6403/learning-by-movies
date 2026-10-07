/** 75.5 -> "01:15.5", 3725 -> "1:02:05". */
export function formatTime(seconds: number, withTenths = true): string {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const secText = withTenths ? sec.toFixed(1).padStart(4, '0') : String(Math.floor(sec)).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${secText}` : `${String(m).padStart(2, '0')}:${secText}`;
}

export function formatRange(start: number, end: number): string {
  return `${formatTime(start, false)} – ${formatTime(end, false)}`;
}

export function formatOffset(offset: number): string {
  return `${offset > 0 ? '+' : ''}${offset.toFixed(1)} s`;
}

export function episodeLabel(season?: number, episode?: number): string {
  if (season == null && episode == null) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${season != null ? `S${pad(season)}` : ''}${episode != null ? `E${pad(episode)}` : ''}`;
}

/** "The.Office.S02E05.720p.en.srt" -> { name: "The Office", season: 2, episode: 5 } */
export function guessTitleFromFileName(fileName: string): { name: string; season?: number; episode?: number } {
  const base = fileName.replace(/\.[^.]+$/, '');
  const ep = base.match(/[Ss](\d{1,2})[ ._-]?[Ee](\d{1,3})/) ?? base.match(/\b(\d{1,2})x(\d{2})\b/);
  let name = ep ? base.slice(0, ep.index) : base;
  name = name
    .replace(/[._]+/g, ' ')
    .replace(/\b(19|20)\d{2}\b.*$/, '') // drop year and everything after (release tags)
    .replace(/\b(480p|720p|1080p|2160p|web|webrip|bluray|hdtv|x264|x265|en|eng|english)\b.*$/i, '')
    .replace(/[\s-]+$/, '')
    .trim();
  return { name: name || base, season: ep ? Number(ep[1]) : undefined, episode: ep ? Number(ep[2]) : undefined };
}
