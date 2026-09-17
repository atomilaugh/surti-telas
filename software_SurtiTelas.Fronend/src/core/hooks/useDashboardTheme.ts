import { useState, useEffect } from 'react';

const STORAGE_KEY = 'dashboard-theme';

export const useDashboardTheme = (): [boolean, () => void] => {
  const [theme, setTheme] = useState<boolean>(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
     return stored === 'light' ? false : stored === 'dark' ? true : false;
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const scopedRoots = Array.from(document.querySelectorAll<HTMLElement>('[data-dashboard-theme]'));
    if (scopedRoots.length > 0) {
      scopedRoots.forEach(root => {
        if (theme) {
          root.setAttribute('data-theme', 'dark');
        } else {
          root.setAttribute('data-theme', 'light');
        }
      });
    }

    try {
      document.documentElement.removeAttribute('data-theme');
      document.body?.removeAttribute('data-theme');
    } catch (_e) {
      // ignore
    }

    window.localStorage.setItem(STORAGE_KEY, theme ? 'dark' : 'light');

    try {
      const ev = new CustomEvent('dashboard-theme-changed', { detail: theme ? 'dark' : 'light' });
      window.dispatchEvent(ev);
    } catch (_e) {
      // ignore
    }
  }, [theme]);

  const toggle = () => setTheme(prev => !prev);

  return [theme, toggle];
};
