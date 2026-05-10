const AURORA_ATTRIBUTE = 'data-aurora';
const AURORA_VALUE = 'on';
const AURORA_DEBUG_KEY = 'aurora-debug';

declare global {
  interface Window {
    __ensureAuroraTheme?: (reason?: string) => void;
    __auroraDebug?: {
      enable: () => void;
      disable: () => void;
      snapshot: () => Record<string, unknown>;
    };
  }
}

function canUseDOM() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function getDebugFlagFromUrl() {
  if (!canUseDOM()) return null;
  const value = new URLSearchParams(window.location.search).get('auroraDebug');
  if (value === '1' || value === 'true' || value === 'on') return true;
  if (value === '0' || value === 'false' || value === 'off') return false;
  return null;
}

export function syncAuroraDebugPreference() {
  if (!canUseDOM()) return false;

  const urlFlag = getDebugFlagFromUrl();
  if (urlFlag === true) {
    window.localStorage.setItem(AURORA_DEBUG_KEY, '1');
  } else if (urlFlag === false) {
    window.localStorage.removeItem(AURORA_DEBUG_KEY);
  }

  return isAuroraDebugEnabled();
}

export function isAuroraDebugEnabled() {
  if (!canUseDOM()) return false;
  return window.localStorage.getItem(AURORA_DEBUG_KEY) === '1';
}

export function getAuroraThemeSnapshot() {
  if (!canUseDOM()) return {};

  const html = document.documentElement;
  const body = document.body;
  const root = document.getElementById('root');
  const beforeStyles = body ? window.getComputedStyle(body, '::before') : null;

  return {
    path: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    htmlAttr: html.getAttribute(AURORA_ATTRIBUTE),
    bodyAttr: body?.getAttribute(AURORA_ATTRIBUTE) ?? null,
    rootAttr: root?.getAttribute(AURORA_ATTRIBUTE) ?? null,
    htmlClasses: html.className,
    bodyClasses: body?.className ?? '',
    rootClasses: root?.className ?? '',
    colorScheme: html.style.colorScheme || body?.style.colorScheme || null,
    bodyBackground: body ? window.getComputedStyle(body).backgroundColor : null,
    auroraPseudoBackground: beforeStyles?.backgroundImage ?? 'none',
  };
}

function hasBrokenAuroraState() {
  if (!canUseDOM()) return false;

  const html = document.documentElement;
  const body = document.body;

  return (
    html.getAttribute(AURORA_ATTRIBUTE) !== AURORA_VALUE ||
    body?.getAttribute(AURORA_ATTRIBUTE) !== AURORA_VALUE ||
    html.classList.contains('aurora-off') ||
    body?.classList.contains('aurora-off')
  );
}

export function ensureAuroraTheme(reason = 'app') {
  if (!canUseDOM()) return;

  window.__ensureAuroraTheme?.(reason);

  const html = document.documentElement;
  const body = document.body;
  const root = document.getElementById('root');

  if (html.getAttribute(AURORA_ATTRIBUTE) !== AURORA_VALUE) {
    html.setAttribute(AURORA_ATTRIBUTE, AURORA_VALUE);
  }

  if (body && body.getAttribute(AURORA_ATTRIBUTE) !== AURORA_VALUE) {
    body.setAttribute(AURORA_ATTRIBUTE, AURORA_VALUE);
  }

  if (root && root.getAttribute(AURORA_ATTRIBUTE) !== AURORA_VALUE) {
    root.setAttribute(AURORA_ATTRIBUTE, AURORA_VALUE);
  }

  html.classList.remove('aurora-off');
  body?.classList.remove('aurora-off');
  html.style.colorScheme = 'dark';
  body?.style.setProperty('color-scheme', 'dark');

  if (isAuroraDebugEnabled()) {
    reportAuroraThemeOrigin(reason, { repaired: true });
  }
}

export function reportAuroraThemeOrigin(event: string, details: Record<string, unknown> = {}) {
  if (!canUseDOM() || !isAuroraDebugEnabled()) return;

  console.info('[Aurora Debug]', event, {
    ...details,
    snapshot: getAuroraThemeSnapshot(),
  });
}

export function installAuroraDebugHelpers() {
  if (!canUseDOM()) return;

  window.__auroraDebug = {
    enable: () => {
      window.localStorage.setItem(AURORA_DEBUG_KEY, '1');
      reportAuroraThemeOrigin('debug-enabled');
    },
    disable: () => {
      window.localStorage.removeItem(AURORA_DEBUG_KEY);
      console.info('[Aurora Debug] disabled');
    },
    snapshot: () => getAuroraThemeSnapshot(),
  };
}

export function repairAuroraIfNeeded(reason: string, details: Record<string, unknown> = {}) {
  if (!canUseDOM()) return;

  if (hasBrokenAuroraState()) {
    reportAuroraThemeOrigin(`${reason}:repair-needed`, details);
    ensureAuroraTheme(reason);
    return;
  }

  reportAuroraThemeOrigin(reason, details);
}