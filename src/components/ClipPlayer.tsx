import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { formatTime } from '../utils/format';

export interface ClipPlayerHandle {
  play: () => void;
}

interface Props {
  /** Object URL of the local video file. */
  src: string;
  start: number;
  end: number;
  /** Seconds added before and after the clip. */
  padding: number;
  /** Each change of this value (except 0) plays the current clip. */
  playToken?: number;
  ref?: Ref<ClipPlayerHandle>;
}

/** Plays one subtitle's time range of a local video file, then pauses. */
export function ClipPlayer({ src, start, end, padding, playToken = 0, ref }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stopAt = useRef<number | null>(null);
  const frame = useRef(0);
  const [blocked, setBlocked] = useState(false);
  const [playing, setPlaying] = useState(false);

  const watch = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (stopAt.current != null && v.currentTime >= stopAt.current) {
      v.pause();
      stopAt.current = null;
      return;
    }
    frame.current = requestAnimationFrame(watch);
  }, []);

  const play = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const go = () => {
      v.currentTime = Math.max(0, start - padding);
      stopAt.current = end + padding;
      v.play().then(
        () => setBlocked(false),
        () => setBlocked(true), // autoplay refused by the browser: wait for a tap
      );
    };
    if (v.readyState >= 1) go();
    else v.addEventListener('loadedmetadata', go, { once: true });
  }, [start, end, padding]);

  useImperativeHandle(ref, () => ({ play }), [play]);

  // Show the first frame of the clip when the card changes.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    stopAt.current = null;
    const seek = () => (v.currentTime = Math.max(0, start - padding));
    if (v.readyState >= 1) seek();
    else v.addEventListener('loadedmetadata', seek, { once: true });
  }, [src, start, padding]);

  useEffect(() => {
    if (playToken) play();
    // Only a new token triggers playback; `play` already sees the latest start/end.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playToken]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return (
    <div className="overflow-hidden rounded-2xl bg-black">
      <video
        ref={videoRef}
        src={src}
        playsInline
        preload="metadata"
        className="aspect-video w-full bg-black"
        onPlay={() => {
          setPlaying(true);
          cancelAnimationFrame(frame.current);
          frame.current = requestAnimationFrame(watch);
        }}
        onPause={() => {
          setPlaying(false);
          cancelAnimationFrame(frame.current);
        }}
        onClick={() => (playing ? videoRef.current?.pause() : play())}
      />
      <div className="flex items-center gap-2 bg-slate-900 px-3 py-2 text-xs text-slate-300">
        <button type="button" className="btn btn-sm border-slate-700 bg-slate-800 text-white hover:bg-slate-700" onClick={play}>
          {playing ? '↻ Replay' : '▶ Play clip'}
        </button>
        {playing && (
          <button type="button" className="btn btn-sm border-slate-700 bg-slate-800 text-white hover:bg-slate-700" onClick={() => videoRef.current?.pause()}>
            ❚❚
          </button>
        )}
        <span className="ml-auto font-mono">
          {formatTime(start)} → {formatTime(end)}
        </span>
        {blocked && <span className="text-amber-400">Tap play to start</span>}
      </div>
    </div>
  );
}
