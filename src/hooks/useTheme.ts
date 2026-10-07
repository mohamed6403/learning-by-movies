import { useEffect } from 'react';
import type { Theme } from '../db/settings';

/** Keep the `dark` class on <html> in sync with the theme setting and the OS preference. */
export function useTheme(theme: Theme): void {
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches);
      document.documentElement.classList.toggle('dark', dark);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0f172a' : '#f8fafc');
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
}
