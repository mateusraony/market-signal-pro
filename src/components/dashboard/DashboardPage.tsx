import { useMemo } from 'react';
import { useAlerts } from '@/hooks/useAlerts';
import { PriceChart } from './PriceChart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Bell, TrendingUp, BarChart3 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function DashboardPage() {
  const { alerts, isLoading } = useAlerts();

  // Get unique symbols from alerts (only active and binance/bybit for live data)
  const monitoredSymbols = useMemo(() => {
    const symbolMap = new Map<string, { symbol: string; exchange: string; targetPrice?: number }>();
    
    alerts
      .filter(a => a.active && !a.paused && (a.exchange === 'binance' || a.exchange === 'bybit'))
      .forEach(alert => {
        const key = `${alert.symbol}-${alert.exchange}`;
        if (!symbolMap.has(key)) {
          symbolMap.set(key, {
            symbol: alert.symbol,
            exchange: alert.exchange,
            targetPrice: alert.type === 'price_level' ? alert.params.target_price : undefined,
          });
        }
      });
    
    return Array.from(symbolMap.values());
  }, [alerts]);

  // Stats
  const stats = useMemo(() => {
    const total = alerts.length;
    const active = alerts.filter(a => a.active && !a.paused).length;
    const paused = alerts.filter(a => a.paused).length;
    const byType = {
      price_level: alerts.filter(a => a.type === 'price_level').length,
      rsi_level: alerts.filter(a => a.type === 'rsi_level').length,
      macd_cross: alerts.filter(a => a.type === 'macd_cross').length,
      volume_spike: alerts.filter(a => a.type === 'volume_spike').length,
    };
    return { total, active, paused, byType };
  }, [alerts]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          Dashboard
        </h1>
        <p className="text-muted-foreground">
          Acompanhe os preços em tempo real dos ativos monitorados
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Alertas</p>
                <p className="text-2xl font-bold font-mono">{stats.total}</p>
              </div>
              <Bell className="h-8 w-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ativos</p>
                <p className="text-2xl font-bold font-mono text-chart-2">{stats.active}</p>
              </div>
              <Activity className="h-8 w-8 text-chart-2/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Símbolos</p>
                <p className="text-2xl font-bold font-mono">{monitoredSymbols.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary" className="text-xs">
                Preço: {stats.byType.price_level}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                RSI: {stats.byType.rsi_level}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                MACD: {stats.byType.macd_cross}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Volume: {stats.byType.volume_spike}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      {monitoredSymbols.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {monitoredSymbols.map(({ symbol, exchange, targetPrice }) => (
            <PriceChart 
              key={`${symbol}-${exchange}`}
              symbol={symbol}
              exchange={exchange}
              targetPrice={targetPrice}
            />
          ))}
        </div>
      ) : (
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Nenhum símbolo monitorado</CardTitle>
            <CardDescription>
              Crie alertas para começar a monitorar preços em tempo real.
              Os gráficos aparecem automaticamente para alertas ativos de criptomoedas.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Popular Pairs (always show some popular ones) */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Pares Populares
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <PriceChart symbol="BTCUSDT" exchange="binance" />
          <PriceChart symbol="ETHUSDT" exchange="binance" />
          <PriceChart symbol="SOLUSDT" exchange="binance" />
        </div>
      </div>
    </div>
  );
}
