import { describe, expect, it } from 'vitest';
import { parseSrt } from '../parsers/srt';
import { buildCardDrafts } from './cards';
import { splitIntoSequences } from './sequences';

const en = parseSrt(`1
00:00:01,000 --> 00:00:02,000
I think that

2
00:00:02,100 --> 00:00:03,500
we should go.

3
00:00:10,000 --> 00:00:12,000
<i>Where are you?</i>

4
00:00:30,000 --> 00:00:31,000
[thunder]
`);

const ar = parseSrt(`1
00:00:01,500 --> 00:00:03,800
أعتقد أنه علينا الذهاب.

2
00:00:10,200 --> 00:00:12,000
أين أنت؟
`);

describe('buildCardDrafts (end to end)', () => {
  it('turns two subtitle files into matched sentence cards', () => {
    const cards = buildCardDrafts(en, ar, 0);
    expect(cards).toEqual([
      { index: 0, start: 1, end: 3.5, front: 'I think that we should go.', back: 'أعتقد أنه علينا الذهاب.' },
      { index: 1, start: 10, end: 12, front: 'Where are you?', back: 'أين أنت؟' },
    ]);
    expect(splitIntoSequences(cards, 4)).toHaveLength(2);
  });

  it('leaves the back empty when the offset breaks the sync', () => {
    expect(buildCardDrafts(en, ar, 20).every((c) => c.back === '')).toBe(true);
  });
});
