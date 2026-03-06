import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Activity, Loader2 } from 'lucide-react';

interface ChartPoint {
  time: string;
  duration: number;
  processed: number;
  triggered: number;
}

export function SchedulerLatencyChart() {
  const [data, setData] = useState<ChartPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const { data: events } = await supabase
        .from('system_events')
        .select('*')
        .eq('type', 'scheduler_run')
        .order('start_time_utc', { ascending: true })
        .limit(50);

      if (events) {
        setData(events.map(e => {
          const details = e.details as Record<string, number> | null;
          return {
            time: new Date(e.start_time_utc).toLocaleTimeString('pt-BR', {
              timeZone: 'America/Sao_Paulo',
              hour: '2-digit',
              minute: '2-digit',
            }),
            duration: details?.duration_ms ?? 0,
            processed: details?.processed_alerts ?? 0,
            triggered: details?.triggered_alerts ?? 0,
          };
        }));
      }
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const avgDuration = data.length > 0
    ? Math.round(data.reduce((sum, d) => sum + d.duration, 0) / data.length)
    : 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Latência do Scheduler
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            Média: {avgDuration < 1000 ? `${avgDuration}ms` : `${(avgDuration / 1000).toFixed(1)}s`}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <defs>
                <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => v < 1000 ? `${v}ms` : `${(v / 1000).toFixed(0)}s`}
                stroke="hsl(var(--muted-foreground))"
                width={45}
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'duration') return [`${value < 1000 ? `${value}ms` : `${(value / 1000).toFixed(1)}s`}`, 'Duração'];
                  return [value, name];
                }}
              />
              <ReferenceLine
                y={avgDuration}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="3 3"
                strokeOpacity={0.5}
              />
              <Area
                type="monotone"
                dataKey="duration"
                stroke="hsl(var(--primary))"
                fill="url(#latencyGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Últimas {data.length} execuções — duração em milissegundos
        </p>
      </CardContent>
    </Card>
  );
}
