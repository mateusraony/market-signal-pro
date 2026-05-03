import { useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'aurora-theme-enabled';

export function useAuroraTheme() {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(enabled));
    if (enabled) {
      document.documentElement.classList.remove('aurora-off');
    } else {
      document.documentElement.classList.add('aurora-off');
    }
  }, [enabled]);

  const toggle = useCallback(() => setEnabled((v) => !v), []);

  return { enabled, setEnabled, toggle };
}
