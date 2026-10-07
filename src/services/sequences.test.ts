import { describe, expect, it } from 'vitest';
import { mergeIntoSentences, splitIntoSequences } from './sequences';

const cue = (start: number, end: number, text = 'x.') => ({ start, end, text });

describe('splitIntoSequences', () => {
  it('returns no sequence for no items', () => {
    expect(splitIntoSequences([], 4)).toEqual([]);
  });

  it('starts a new sequence when the gap is bigger than N seconds', () => {
    const items = [cue(0, 2), cue(3, 5), cue(10, 12), cue(15, 17), cue(30, 31)];
    const seqs = splitIntoSequences(items, 4);
    expect(seqs.map((s) => s.items.length)).toEqual([2, 2, 1]);
    expect(seqs.map((s) => [s.start, s.end])).toEqual([
      [0, 5],
      [10, 17],
      [30, 31],
    ]);
    expect(seqs.map((s) => s.index)).toEqual([0, 1, 2]);
  });

  it('does not split when the gap equals N exactly', () => {
    expect(splitIntoSequences([cue(0, 1), cue(5, 6)], 4)).toHaveLength(1);
  });

  it('uses the adjustable gap', () => {
    const items = [cue(0, 1), cue(3, 4), cue(6, 7)];
    expect(splitIntoSequences(items, 1)).toHaveLength(3);
    expect(splitIntoSequences(items, 2)).toHaveLength(1);
  });

  it('measures the gap from the latest end, even with overlapping cues', () => {
    // cue 2 ends before cue 1; the gap to cue 3 is computed from cue 1's end (9).
    const items = [cue(0, 9), cue(1, 2), cue(11, 12)];
    expect(splitIntoSequences(items, 4)).toHaveLength(1);
  });
});

describe('mergeIntoSentences', () => {
  it('merges a sentence split across cues', () => {
    const merged = mergeIntoSentences([cue(1, 2, 'I think that'), cue(2.2, 3.5, 'we should go.'), cue(4, 5, 'Okay.')]);
    expect(merged).toEqual([cue(1, 3.5, 'I think that we should go.'), cue(4, 5, 'Okay.')]);
  });

  it('merges trailing and leading ellipses', () => {
    expect(mergeIntoSentences([cue(0, 1, 'If you want...'), cue(1.1, 2, '...we can leave.')])).toEqual([
      cue(0, 2, 'If you want... we can leave.'),
    ]);
  });

  it('keeps finished sentences separate', () => {
    const cues = [cue(0, 1, 'Hello.'), cue(1.1, 2, 'how are you?')];
    expect(mergeIntoSentences(cues)).toHaveLength(2);
  });

  it('does not merge across a long pause or between dialogue lines', () => {
    expect(mergeIntoSentences([cue(0, 1, 'Wait'), cue(5, 6, 'for me.')])).toHaveLength(2);
    expect(mergeIntoSentences([cue(0, 1, '- Hi\n- Hey'), cue(1.1, 2, 'there.')])).toHaveLength(2);
    expect(mergeIntoSentences([cue(0, 1, 'Wait'), cue(1.1, 2, '- for me.')])).toHaveLength(2);
  });

  it('merges at most three cues', () => {
    const cues = [cue(0, 1, 'a'), cue(1, 2, 'b'), cue(2, 3, 'c'), cue(3, 4, 'd.')];
    expect(mergeIntoSentences(cues).map((c) => c.text)).toEqual(['a b c', 'd.']);
  });

  it('does not mutate its input', () => {
    const input = [cue(0, 1, 'I think'), cue(1, 2, 'so.')];
    mergeIntoSentences(input);
    expect(input[0].text).toBe('I think');
  });
});
