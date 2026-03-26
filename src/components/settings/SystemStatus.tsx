import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, CheckCircle2, XCircle, RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SystemStatus {
  scheduler: 'online' | 'offline' | 'checking';
  lastRun: Date | null;
  alertsProcessed: number;
  alertsTriggered: number;
}

export function SystemStatus() {
  const [status, setStatus] = useState<SystemStatus>({
    scheduler: 'checking',
    lastRun: null,
    alertsProcessed: 0,
    alertsTriggered: 0,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkStatus = async () => {
    setIsRefreshing(true);
    try {
      // Check last scheduler run
      const { data: events } = await supabase
        .from('system_events')
        .select('*')
        .eq('type', 'scheduler_run')
        .order('start_time_utc', { ascending: false })
        .limit(1);

      if (events && events.length > 0) {
        const lastEvent = events[0];
        const lastRunTime = new Date(lastEvent.start_time_utc);
        const now = new Date();
        const diffMinutes = (now.getTime() - lastRunTime.getTime()) / 60000;

        setStatus({
          scheduler: diffMinutes < 5 ? 'online' : 'offline',
          lastRun: lastRunTime,
          alertsProcessed: (lastEvent.details as any)?.processed_alerts || 0,
          alertsTriggered: (lastEvent.details as any)?.triggered_alerts || 0,
        });
      } else {
        setStatus(prev => ({ ...prev, scheduler: 'offline' }));
      }
    } catch (error) {
      console.error('Error checking status:', error);
      setStatus(prev => ({ ...prev, scheduler: 'offline' }));
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const formatLastRun = (date: Date | null) => {
    if (!date) return 'Nunca';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    if (minutes > 60) {
      return date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s atrás`;
    }
    return `${seconds}s atrás`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Status do Sistema
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={checkStatus}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scheduler Status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            {status.scheduler === 'checking' ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : status.scheduler === 'online' ? (
              <CheckCircle2 className="w-4 h-4 text-success" />
            ) : (
              <XCircle className="w-4 h-4 text-destructive" />
            )}
            <span className="font-medium">Processador de Alertas</span>
          </div>
          <Badge 
            variant={status.scheduler === 'online' ? 'default' : 'destructive'}
            className={cn(
              status.scheduler === 'online' && "bg-success text-success-foreground"
            )}
          >
            {status.scheduler === 'checking' ? 'Verificando...' : 
             status.scheduler === 'online' ? 'Online' : 'Offline'}
          </Badge>
        </div>

        {/* Last Run Info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-muted/30">
            <p className="text-xs text-muted-foreground">Última execução</p>
            <p className="font-mono text-sm">{formatLastRun(status.lastRun)}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30">
            <p className="text-xs text-muted-foreground">Alertas processados</p>
            <p className="font-mono text-sm">{status.alertsProcessed}</p>
          </div>
        </div>

        {/* Manual Run Button */}
        <Button 
          variant="outline" 
          className="w-full"
          disabled
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Execução Manual (somente backend)
        </Button>
        <p className="text-xs text-muted-foreground">
          Por segurança, o scheduler aceita apenas chamadas internas com service role key.
        </p>
      </CardContent>
    </Card>
  );
}
