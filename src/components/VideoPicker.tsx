import { useRef } from 'react';
import { useTitleVideo } from '../hooks/video';

interface Props {
  titleId: number;
  /** Name of the video used last time, as a reminder. */
  lastName?: string;
  compact?: boolean;
}

/** Choose a local video file for a title. It is only read by this browser, never uploaded. */
export function VideoPicker({ titleId, lastName, compact }: Props) {
  const { video, setVideo } = useTitleVideo(titleId);
  const input = useRef<HTMLInputElement>(null);

  return (
    <div className={compact ? 'inline-flex' : 'flex flex-wrap items-center gap-2'}>
      <input
        ref={input}
        type="file"
        accept="video/*,.mkv"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setVideo(f);
          e.target.value = '';
        }}
      />
      {video ? (
        <>
          {!compact && <span className="chip max-w-56 truncate">🎬 {video.name}</span>}
          <button type="button" className="btn btn-sm" onClick={() => input.current?.click()}>
            Change video
          </button>
          {!compact && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setVideo(null)}>
              Remove
            </button>
          )}
        </>
      ) : (
        <>
          <button type="button" className="btn btn-sm" onClick={() => input.current?.click()}>
            🎬 {compact ? 'Add video' : 'Select video file'}
          </button>
          {!compact && (
            <span className="muted text-xs">{lastName ? `Last used: ${lastName}` : 'Optional — plays the clip of each card. Stays on your device.'}</span>
          )}
        </>
      )}
    </div>
  );
}
