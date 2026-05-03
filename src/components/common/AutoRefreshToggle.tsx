import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Props {
  storageKey: string;
  defaultEnabled?: boolean;
  defaultIntervalSec?: number;
  onChange: (intervalMs: number | false) => void;
}

const OPTIONS = [10, 30, 60, 300];

export function AutoRefreshToggle({ storageKey, defaultEnabled = false, defaultIntervalSec = 30, onChange }: Props) {
  const [enabled, setEnabled] = useState<boolean>(() => {
    const v = localStorage.getItem(`${storageKey}:enabled`);
    return v === null ? defaultEnabled : v === '1';
  });
  const [interval, setIntervalSec] = useState<number>(() => {
    const v = localStorage.getItem(`${storageKey}:interval`);
    return v ? Number(v) : defaultIntervalSec;
  });

  useEffect(() => {
    localStorage.setItem(`${storageKey}:enabled`, enabled ? '1' : '0');
    localStorage.setItem(`${storageKey}:interval`, String(interval));
    onChange(enabled ? interval * 1000 : false);
  }, [enabled, interval, storageKey, onChange]);

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border bg-card">
      <RefreshCw className={`w-4 h-4 ${enabled ? 'text-success animate-spin-slow' : 'text-muted-foreground'}`} />
      <span className="text-sm text-muted-foreground hidden sm:inline">Auto-refresh</span>
      <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Auto-refresh" />
      <Select value={String(interval)} onValueChange={(v) => setIntervalSec(Number(v))} disabled={!enabled}>
        <SelectTrigger className="w-[90px] h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map((s) => (
            <SelectItem key={s} value={String(s)}>
              {s < 60 ? `${s}s` : `${s / 60}m`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
