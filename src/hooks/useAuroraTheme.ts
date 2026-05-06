import { useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'aurora-theme-enabled';

function applyToDom(enabled: boolean) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('aurora-off', !enabled);
  root.setAttribute('data-aurora', enabled ? 'on' : 'off');
}

export function useAuroraTheme() {
  const [enabled, setEnabledState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  });

  // Apply immediately whenever state changes (no reload needed)
  useEffect(() => {
    applyToDom(enabled);
  }, [enabled]);

  const setEnabled = useCallback((value: boolean | ((v: boolean) => boolean)) => {
    setEnabledState((prev) => {
      const next = typeof value === 'function' ? (value as (v: boolean) => boolean)(prev) : value;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {}
      applyToDom(next);
      return next;
    });
  }, []);

  const toggle = useCallback(() => setEnabled((v) => !v), [setEnabled]);

  // Sync across tabs via storage events
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      const next = e.newValue === null ? true : e.newValue === 'true';
      setEnabledState((prev) => (prev === next ? prev : next));
      applyToDom(next);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return { enabled, setEnabled, toggle };
}
