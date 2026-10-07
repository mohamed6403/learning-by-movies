import { describe, expect, it } from 'vitest';
import { parseAss } from './ass';
import { cleanText } from './clean';
import { decodeBytes, detectEncoding } from './encoding';
import { detectFormat, parseSubtitle } from './index';
import { parseSrt } from './srt';
import { parseTimestamp } from './time';
import { parseVtt } from './vtt';

describe('parseTimestamp', () => {
  it('parses SRT, VTT and ASS timestamps', () => {
    expect(parseTimestamp('00:01:02,500')).toBe(62.5);
    expect(parseTimestamp('01:00:00.250')).toBe(3600.25);
    expect(parseTimestamp('01:02.003')).toBeCloseTo(62.003);
    expect(parseTimestamp('0:00:05.50')).toBe(5.5);
    expect(parseTimestamp('nope')).toBeNaN();
  });
});

describe('cleanText', () => {
  it('removes HTML tags and entities', () => {
    expect(cleanText('<i>Hello</i> <font color="#fff">there</font> &amp; you')).toBe('Hello there & you');
  });
  it('removes ASS override codes and converts \\N', () => {
    expect(cleanText('{\\an8}{\\i1}Hi\\Nfriend{\\i0}')).toBe('Hi friend');
  });
  it('removes music symbols', () => {
    expect(cleanText('♪ Somewhere over the rainbow ♪')).toBe('Somewhere over the rainbow');
  });
  it('drops sound effect lines and inline sound descriptions', () => {
    expect(cleanText('[door slams]')).toBe('');
    expect(cleanText('(LAUGHS)')).toBe('');
    expect(cleanText('[sighs] I am tired.')).toBe('I am tired.');
    expect(cleanText('♪♪')).toBe('');
  });
  it('removes SDH speaker labels', () => {
    expect(cleanText('JOHN: Where are you going?')).toBe('Where are you going?');
  });
  it('joins wrapped lines but keeps dialogue dashes on separate lines', () => {
    expect(cleanText("I don't think\nwe should go.")).toBe("I don't think we should go.");
    expect(cleanText('- Hi.\n- Hello.')).toBe('- Hi.\n- Hello.');
  });
  it('keeps normal parentheses in speech', () => {
    expect(cleanText("He said (and I quote) that's fine.")).toBe("He said (and I quote) that's fine.");
  });
  it('strips bidi control characters from Arabic text', () => {
    expect(cleanText('‫مرحبا‬')).toBe('مرحبا');
  });
});

describe('parseSrt', () => {
  const srt = `1
00:00:01,000 --> 00:00:03,500
<i>Hello there.</i>

2
00:00:04,000 --> 00:00:06,000
[MUSIC PLAYING]

3
00:00:07,250 --> 00:00:09,000
How are you?
I'm fine.
`;
  it('parses cues, cleans them and drops empty ones', () => {
    expect(parseSrt(srt)).toEqual([
      { start: 1, end: 3.5, text: 'Hello there.' },
      { start: 7.25, end: 9, text: "How are you? I'm fine." },
    ]);
  });
  it('handles CRLF line endings, BOM and missing indexes', () => {
    const crlf = '﻿00:00:01,000 --> 00:00:02,000\r\nOne\r\n\r\n00:00:03,000 --> 00:00:04,000\r\nTwo\r\n';
    expect(parseSrt(crlf).map((c) => c.text)).toEqual(['One', 'Two']);
  });
  it('sorts cues by start time', () => {
    const unordered = '2\n00:00:05,000 --> 00:00:06,000\nB\n\n1\n00:00:01,000 --> 00:00:02,000\nA\n';
    expect(parseSrt(unordered).map((c) => c.text)).toEqual(['A', 'B']);
  });
});

describe('parseVtt', () => {
  it('parses cues with ids, settings, NOTE blocks and short timestamps', () => {
    const vtt = `WEBVTT
Kind: captions

NOTE This is a comment
that spans lines

intro
00:01.000 --> 00:03.000 align:start position:10%
<v Bob>Good morning!</v>

00:00:04.500 --> 00:00:06.000
<c.yellow>See you</c> <00:00:05.000>later.
`;
    expect(parseVtt(vtt)).toEqual([
      { start: 1, end: 3, text: 'Good morning!' },
      { start: 4.5, end: 6, text: 'See you later.' },
    ]);
  });
});

describe('parseAss', () => {
  const ass = `[Script Info]
Title: Test

[V4+ Styles]
Format: Name, Fontname
Style: Default,Arial

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:02.50,Default,,0,0,0,,{\\i1}Hello, world!{\\i0}
Comment: 0,0:00:02.00,0:00:03.00,Default,,0,0,0,,This is a comment
Dialogue: 0,0:00:03.00,0:00:04.00,Signs,,0,0,0,,{\\pos(100,200)}TOKYO STATION
Dialogue: 0,0:00:05.00,0:00:07.00,Default,,0,0,0,,First line\\Nsecond line
Dialogue: 1,0:00:05.00,0:00:07.00,Default,,0,0,0,,First line\\Nsecond line
Dialogue: 0,0:00:08.00,0:00:09.00,Default,,0,0,0,,{\\p1}m 0 0 l 100 0 100 100{\\p0}
`;
  it('parses dialogue, keeps commas in text, skips comments, signs, drawings and duplicates', () => {
    expect(parseAss(ass)).toEqual([
      { start: 1, end: 2.5, text: 'Hello, world!' },
      { start: 5, end: 7, text: 'First line second line' },
    ]);
  });
});

describe('detectFormat / parseSubtitle', () => {
  it('detects format from extension or content', () => {
    expect(detectFormat('a.SRT', '')).toBe('srt');
    expect(detectFormat('a.ssa', '')).toBe('ass');
    expect(detectFormat('a.txt', 'WEBVTT\n\n')).toBe('vtt');
    expect(detectFormat('a.txt', '[Script Info]\n')).toBe('ass');
  });
  it('dispatches to the right parser', () => {
    expect(parseSubtitle('x.vtt', 'WEBVTT\n\n00:01.000 --> 00:02.000\nHi\n')).toEqual([{ start: 1, end: 2, text: 'Hi' }]);
  });
});

describe('encoding detection', () => {
  // "السلام عليكم" in Windows-1256
  const arabic1256 = new Uint8Array([0xc7, 0xe1, 0xd3, 0xe1, 0xc7, 0xe3, 0x20, 0xda, 0xe1, 0xed, 0xdf, 0xe3]);
  // "Ça va très bien, merci. À demain !" in Windows-1252
  const french1252 = new Uint8Array([
    0xc7, 0x61, 0x20, 0x76, 0x61, 0x20, 0x74, 0x72, 0xe8, 0x73, 0x20, 0x62, 0x69, 0x65, 0x6e, 0x2c, 0x20, 0x6d, 0x65,
    0x72, 0x63, 0x69, 0x2e, 0x20, 0xc0, 0x20, 0x64, 0x65, 0x6d, 0x61, 0x69, 0x6e, 0x20, 0x21,
  ]);

  it('detects UTF-8 (with and without BOM)', () => {
    const bytes = new TextEncoder().encode('Ça va? مرحبا');
    expect(detectEncoding(bytes)).toBe('utf-8');
    expect(detectEncoding(new Uint8Array([0xef, 0xbb, 0xbf, ...bytes]))).toBe('utf-8');
    expect(decodeBytes(new Uint8Array([0xef, 0xbb, 0xbf, ...bytes])).text).toBe('Ça va? مرحبا');
  });
  it('detects UTF-16 by BOM', () => {
    expect(detectEncoding(new Uint8Array([0xff, 0xfe, 0x41, 0x00]))).toBe('utf-16le');
  });
  it('detects Windows-1256 Arabic', () => {
    const { text, encoding } = decodeBytes(arabic1256);
    expect(encoding).toBe('windows-1256');
    expect(text).toBe('السلام عليكم');
  });
  it('detects Windows-1252 French', () => {
    const { text, encoding } = decodeBytes(french1252);
    expect(encoding).toBe('windows-1252');
    expect(text).toBe('Ça va très bien, merci. À demain !');
  });
  it('respects a forced encoding', () => {
    expect(decodeBytes(french1252, undefined, 'windows-1256').encoding).toBe('windows-1256');
  });
});
