import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { History, RefreshCw, Loader2, Clock, Zap, Bell, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 10;

interface SchedulerRun {
  id: string;
  start_time_utc: string;
  end_time_utc: string | null;
  details: {
    duration_ms?: number;
    processed_alerts?: number;
    triggered_alerts?: number;
  } | null;
}

export function SchedulerHistory() {
  const [runs, setRuns] = useState<SchedulerRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const fetchRuns = async (pageNum = page) => {
    setIsLoading(true);
    try {
      // Get total count
      const { count } = await supabase
        .from('system_events')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'scheduler_run');

      if (count !== null) setTotalCount(count);

      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data } = await supabase
        .from('system_events')
        .select('*')
        .eq('type', 'scheduler_run')
        .order('start_time_utc', { ascending: false })
        .range(from, to);

      if (data) {
        setRuns(data.map(e => ({
          id: e.id,
          start_time_utc: e.start_time_utc,
          end_time_utc: e.end_time_utc,
          details: e.details as SchedulerRun['details'],
        })));
      }
    } catch (error) {
      console.error('Error fetching scheduler history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns(page);
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const canPrev = page > 0;
  const canNext = page < totalPages - 1;

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
    });
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '—';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getDurationBadge = (ms?: number) => {
    if (!ms) return 'secondary';
    if (ms < 5000) return 'default';
    if (ms < 10000) return 'secondary';
    return 'destructive';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Histórico do Scheduler
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchRuns(page)}
            disabled={isLoading}
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : runs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma execução registrada ainda
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Horário (BRT)
                      </div>
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5" />
                        Duração
                      </div>
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-center">
                      <div className="flex items-center gap-1.5 justify-center">
                        <Bell className="w-3.5 h-3.5" />
                        Processados
                      </div>
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-center">Disparados</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((run) => {
                    const details = run.details;
                    const triggered = details?.triggered_alerts || 0;
                    return (
                      <TableRow key={run.id}>
                        <TableCell className="font-mono text-xs whitespace-nowrap">
                          {formatTime(run.start_time_utc)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getDurationBadge(details?.duration_ms) as any} className="font-mono text-xs">
                            {formatDuration(details?.duration_ms)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-mono text-sm">
                          {details?.processed_alerts ?? '—'}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={cn(
                            "font-mono text-sm font-semibold",
                            triggered > 0 ? "text-warning" : "text-muted-foreground"
                          )}>
                            {triggered}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                {totalCount} execuções registradas
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={!canPrev || isLoading}
                  onClick={() => setPage(p => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs text-muted-foreground font-mono min-w-[60px] text-center">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={!canNext || isLoading}
                  onClick={() => setPage(p => p + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
