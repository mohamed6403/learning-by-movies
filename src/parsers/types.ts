/** A subtitle cue. Times are in seconds. */
export interface Cue {
  start: number;
  end: number;
  text: string;
}

export type SubtitleFormat = 'srt' | 'vtt' | 'ass';
