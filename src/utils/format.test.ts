import { describe, expect, it } from 'vitest';
import { episodeLabel, formatOffset, formatTime, guessTitleFromFileName } from './format';

describe('format', () => {
  it('formats times', () => {
    expect(formatTime(75.5)).toBe('01:15.5');
    expect(formatTime(3725, false)).toBe('1:02:05');
    expect(formatTime(5, false)).toBe('00:05');
  });
  it('formats offsets and episodes', () => {
    expect(formatOffset(1.25)).toBe('+1.3 s');
    expect(formatOffset(-2)).toBe('-2.0 s');
    expect(episodeLabel(1, 3)).toBe('S01E03');
    expect(episodeLabel()).toBe('');
  });
  it('guesses a title from the file name', () => {
    expect(guessTitleFromFileName('The.Office.S02E05.720p.WEB.en.srt')).toEqual({ name: 'The Office', season: 2, episode: 5 });
    expect(guessTitleFromFileName('Spirited.Away.2001.1080p.BluRay.srt')).toEqual({ name: 'Spirited Away' });
    expect(guessTitleFromFileName('Frieren - 1x04.ass')).toEqual({ name: 'Frieren', season: 1, episode: 4 });
  });
});
