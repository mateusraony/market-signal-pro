import { supabase } from '@/integrations/supabase/client';

type LogLevel = 'error' | 'warn' | 'info';

interface LogPayload {
  level?: LogLevel;
  source: string;          // e.g. "PriceChart", "usePriceHistory"
  message: string;
  details?: Record<string, unknown>;
}

// Throttle to avoid flooding (one identical message per 30s)
const recent = new Map<string, number>();
const WINDOW_MS = 30_000;

function shouldLog(key: string) {
  const now = Date.now();
  const last = recent.get(key) ?? 0;
  if (now - last < WINDOW_MS) return false;
  recent.set(key, now);
  // basic GC
  if (recent.size > 200) {
    for (const [k, t] of recent) if (now - t > WINDOW_MS * 5) recent.delete(k);
  }
  return true;
}

export async function logClientError(payload: LogPayload): Promise<void> {
  const { level = 'error', source, message, details = {} } = payload;
  const key = `${source}:${message}`;
  if (!shouldLog(key)) return;

  // Always echo to console so devs see it
  const line = `[${source}] ${message}`;
  if (level === 'error') console.error(line, details);
  else if (level === 'warn') console.warn(line, details);
  else console.info(line, details);

  try {
    const now = new Date().toISOString();
    await supabase.from('system_events').insert({
      type: `client_${level}`,
      start_time_utc: now,
      end_time_utc: now,
      details: {
        source,
        message,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        ...details,
      },
    });
  } catch (e) {
    // Never throw from the logger
    console.warn('errorLogger failed to persist:', e);
  }
}

// Install global handlers once
let installed = false;
export function installGlobalErrorHandlers() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  window.addEventListener('error', (e) => {
    logClientError({
      source: 'window.onerror',
      message: e.message || 'Uncaught error',
      details: { filename: e.filename, lineno: e.lineno, colno: e.colno },
    });
  });

  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason;
    const message =
      reason instanceof Error ? reason.message : typeof reason === 'string' ? reason : 'Unhandled promise rejection';
    logClientError({
      source: 'unhandledrejection',
      message,
      details: { stack: reason instanceof Error ? reason.stack : undefined },
    });
  });
}
