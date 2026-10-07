import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { updateTitle } from '../db/actions';

interface LoadedVideo {
  url: string;
  name: string;
}

interface VideoStore {
  videos: Record<number, LoadedVideo>;
  setVideo: (titleId: number, file: File | null) => void;
}

const VideoContext = createContext<VideoStore | null>(null);

/**
 * Keeps one object URL per title for this browser session.
 * The video file is read directly from disk by the <video> element: nothing is copied or uploaded.
 */
export function VideoProvider({ children }: { children: ReactNode }) {
  const [videos, setVideos] = useState<Record<number, LoadedVideo>>({});
  const videosRef = useRef(videos);
  videosRef.current = videos;

  const setVideo = useCallback((titleId: number, file: File | null) => {
    const previous = videosRef.current[titleId];
    if (previous) URL.revokeObjectURL(previous.url);
    setVideos((v) => {
      const next = { ...v };
      if (file) next[titleId] = { url: URL.createObjectURL(file), name: file.name };
      else delete next[titleId];
      return next;
    });
    if (file) void updateTitle(titleId, { videoName: file.name });
  }, []);

  useEffect(() => () => Object.values(videosRef.current).forEach((v) => URL.revokeObjectURL(v.url)), []);

  return <VideoContext.Provider value={{ videos, setVideo }}>{children}</VideoContext.Provider>;
}

export function useTitleVideo(titleId: number | undefined) {
  const store = useContext(VideoContext);
  if (!store) throw new Error('useTitleVideo must be used inside <VideoProvider>');
  return {
    video: titleId != null ? store.videos[titleId] : undefined,
    setVideo: (file: File | null) => titleId != null && store.setVideo(titleId, file),
  };
}
