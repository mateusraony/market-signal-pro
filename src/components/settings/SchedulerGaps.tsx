import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GapRow {
  id: string;
  start_time_utc: string;
  gap_minutes: number;
  backfill_processed: number;
  backfill_triggered: number;
  source: 'scheduler_run' | 'reconciliation';
  retroactive_rows_in_window?: number;
}

export function SchedulerGaps() {
  const [rows, setRows] = useState<GapRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    try {
      // Pull recent scheduler_run + reconciliation events that contain gap data
      const { data: runs } = await supabase
        .from('system_events')
        .select('*')
        .in('type', ['scheduler_run', 'reconciliation'])
        .order('start_time_utc', { ascending: false })
        .limit(200);

      const list: GapRow[] = [];
      for (const r of runs ?? []) {
        const d = (r.details ?? {}) as Record<string, unknown>;
        const gap = Number(d.gap_minutes_from_previous ?? d.gap_minutes ?? 0);
        const triggered = Number(d.backfill_triggered ?? 0);
        const processed = Number(d.backfill_processed ?? 0);
        // Only show entries that actually involved a gap or a backfill
        if (gap > 3 || triggered > 0 || processed > 0 || r.type === 'reconciliation') {
          list.push({
            id: r.id,
            start_time_utc: r.start_time_utc,
            gap_minutes: gap,
            backfill_processed: processed,
            backfill_triggered: triggered,
            source: r.type as GapRow['source'],
            retroactive_rows_in_window: d.retroactive_rows_in_window as number | undefined,
          });
        }
      }
      setRows(list.slice(0, 20));
    } catch (e) {
      console.error('Error loading scheduler gaps:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    const i = setInterval(load, 60_000);
    return () => clearInterval(i);
  }, []);

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Gaps & Backfill
          </div>
          <Button variant="ghost" size="icon" onClick={load} disabled={isLoading}>
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </Button>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Lacunas detectadas pelo scheduler e reprocessamentos retroativos correspondentes.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-success">
            <CheckCircle2 className="w-4 h-4" />
            Nenhum gap relevante detectado recentemente.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando (BRT)</TableHead>
                  <TableHead>Gap</TableHead>
                  <TableHead className="text-center">Backfill processed</TableHead>
                  <TableHead className="text-center">Backfill triggered</TableHead>
                  <TableHead>Origem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{formatTime(r.start_time_utc)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          'font-mono text-xs',
                          r.gap_minutes > 10
                            ? 'text-destructive border-destructive/40'
                            : r.gap_minutes > 3
                            ? 'text-warning border-warning/40'
                            : 'text-muted-foreground'
                        )}
                      >
                        {r.gap_minutes.toFixed(1)} min
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm">{r.backfill_processed}</TableCell>
                    <TableCell className="text-center">
                      <span
                        className={cn(
                          'font-mono text-sm font-semibold',
                          r.backfill_triggered > 0 ? 'text-warning' : 'text-muted-foreground'
                        )}
                      >
                        {r.backfill_triggered}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {r.source === 'reconciliation' ? 'Reconciliação' : 'Scheduler'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
