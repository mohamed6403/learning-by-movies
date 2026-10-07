import { useLiveQuery } from 'dexie-react-hooks';
import { DEFAULT_GAP_SECONDS } from '../services/sequences';
import { db } from './schema';

export type Theme = 'system' | 'light' | 'dark';

export interface Settings {
  /** Silence (seconds) that starts a new sequence. */
  gapSeconds: number;
  /** New cards introduced per day in the daily review. */
  newPerDay: number;
  /** Play the video clip automatically when a card is shown. */
  autoPlay: boolean;
  /** Seconds added before and after a clip. */
  clipPadding: number;
  theme: Theme;
}

export const DEFAULT_SETTINGS: Settings = {
  gapSeconds: DEFAULT_GAP_SECONDS,
  newPerDay: 20,
  autoPlay: false,
  clipPadding: 0.3,
  theme: 'system',
};

const KEY = 'app';
export const THEME_STORAGE_KEY = 'subcards-theme';

export async function getSettings(): Promise<Settings> {
  const row = await db.settings.get(KEY);
  return { ...DEFAULT_SETTINGS, ...(row?.value as Partial<Settings> | undefined) };
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  const current = await getSettings();
  await db.settings.put({ key: KEY, value: { ...current, ...patch } });
  if (patch.theme) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, patch.theme);
    } catch {
      // storage unavailable: the theme still applies for this session
    }
  }
}

export function useSettings(): Settings {
  return useLiveQuery(getSettings, [], DEFAULT_SETTINGS);
}
