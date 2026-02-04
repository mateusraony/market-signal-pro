import { useMemo, useEffect, useState } from 'react';
import { 
  XAxis, 
  YAxis, 
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePriceHistory } from '@/hooks/usePriceHistory';
import { TrendingUp, TrendingDown, Wifi, WifiOff, ArrowUp, ArrowDown, AlertTriangle, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotificationSound } from '@/hooks/useNotificationSound';

interface PriceChartProps {
  symbol: string;
  exchange: string;
  targetPrice?: number;
}

export function PriceChart({ symbol, exchange, targetPrice }: PriceChartProps) {
  const { priceHistory, currentPrice, change24h, isConnected, high24h, low24h } = usePriceHistory(symbol);
  const { playAlertSound } = useNotificationSound();
  const [hasAlerted, setHasAlerted] = useState(false);

  // Calculate proximity to target price
  const proximityInfo = useMemo(() => {
    if (!targetPrice || !currentPrice) return null;
    
    const distance = Math.abs(currentPrice - targetPrice);
    const percentDistance = (distance / targetPrice) * 100;
    const isAbove = currentPrice > targetPrice;
    
    // Thresholds: critical (<1%), warning (<3%), near (<5%)
    let level: 'critical' | 'warning' | 'near' | null = null;
    if (percentDistance < 1) level = 'critical';
    else if (percentDistance < 3) level = 'warning';
    else if (percentDistance < 5) level = 'near';
    
    return { distance, percentDistance, isAbove, level };
  }, [currentPrice, targetPrice]);

  // Play sound when reaching critical level
  useEffect(() => {
    if (proximityInfo?.level === 'critical' && !hasAlerted) {
      playAlertSound();
      setHasAlerted(true);
    } else if (proximityInfo?.level !== 'critical' && hasAlerted) {
      setHasAlerted(false);
    }
  }, [proximityInfo?.level, hasAlerted, playAlertSound]);

  const formattedPrice = useMemo(() => {
    if (!currentPrice) return '—';
    return currentPrice >= 1 
      ? currentPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : currentPrice.toLocaleString('pt-BR', { minimumFractionDigits: 6, maximumFractionDigits: 8 });
  }, [currentPrice]);

  const priceRange = useMemo(() => {
    if (priceHistory.length < 2) return { min: 0, max: 0 };
    const prices = priceHistory.map(p => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.1 || max * 0.01;
    return { min: min - padding, max: max + padding };
  }, [priceHistory]);

  const isPositive = change24h !== null && change24h >= 0;
  const chartColor = isPositive ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))';
  
  // Card border color based on proximity
  const cardBorderClass = useMemo(() => {
    if (!proximityInfo?.level) return 'border-border/50 hover:border-primary/30';
    switch (proximityInfo.level) {
      case 'critical': return 'border-destructive animate-pulse shadow-lg shadow-destructive/20';
      case 'warning': return 'border-warning animate-pulse';
      case 'near': return 'border-primary/50';
      default: return 'border-border/50 hover:border-primary/30';
    }
  }, [proximityInfo?.level]);

  if (priceHistory.length === 0) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-mono flex items-center gap-2">
              {symbol}
              <Badge variant="outline" className="text-xs">{exchange}</Badge>
            </CardTitle>
            <Skeleton className="h-4 w-4 rounded-full" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32 mb-4" />
          <Skeleton className="h-[150px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("bg-card/50 transition-all duration-300", cardBorderClass)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-mono flex items-center gap-2">
            {symbol}
            <Badge variant="outline" className="text-xs uppercase">{exchange}</Badge>
            {proximityInfo?.level && (
              <Badge 
                variant={proximityInfo.level === 'critical' ? 'destructive' : 'secondary'}
                className={cn(
                  "text-xs gap-1",
                  proximityInfo.level === 'critical' && "animate-pulse",
                  proximityInfo.level === 'warning' && "bg-warning text-warning-foreground"
                )}
              >
                {proximityInfo.level === 'critical' && <AlertTriangle className="h-3 w-3" />}
                {proximityInfo.level === 'warning' && <Target className="h-3 w-3" />}
                {proximityInfo.percentDistance.toFixed(1)}% do alvo
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Wifi className="h-4 w-4 text-chart-2" />
            ) : (
              <WifiOff className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Price and change */}
        <div className="flex items-end justify-between">
          <div>
            <div className={cn(
              "text-2xl font-bold font-mono tracking-tight transition-colors",
              proximityInfo?.level === 'critical' && "text-destructive"
            )}>
              ${formattedPrice}
            </div>
            <div className={cn(
              "flex items-center gap-1 text-sm font-medium",
              isPositive ? "text-chart-2" : "text-destructive"
            )}>
              {isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>{isPositive ? '+' : ''}{change24h?.toFixed(2)}%</span>
              <span className="text-muted-foreground text-xs">24h</span>
            </div>
          </div>
          
          {/* Target price info */}
          <div className="text-right text-xs space-y-1">
            {targetPrice ? (
              <>
                <div className="flex items-center gap-1 text-primary">
                  <Target className="h-3 w-3" />
                  <span className="font-mono">${targetPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                {proximityInfo && (
                  <div className={cn(
                    "text-xs font-medium",
                    proximityInfo.level === 'critical' && "text-destructive",
                    proximityInfo.level === 'warning' && "text-warning",
                    proximityInfo.level === 'near' && "text-primary"
                  )}>
                    {proximityInfo.isAbove ? '↑' : '↓'} {proximityInfo.percentDistance.toFixed(2)}%
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center gap-1 text-chart-2">
                  <ArrowUp className="h-3 w-3" />
                  <span className="font-mono">${high24h?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex items-center gap-1 text-destructive">
                  <ArrowDown className="h-3 w-3" />
                  <span className="font-mono">${low24h?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Chart */}
        <div className="h-[150px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={priceHistory} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <defs>
                <linearGradient id={`gradient-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="formattedTime" 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={50}
              />
              <YAxis 
                domain={[priceRange.min, priceRange.max]}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                orientation="right"
                tickFormatter={(value) => value >= 1 ? value.toFixed(2) : value.toFixed(6)}
                width={60}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number) => [
                  `$${value >= 1 ? value.toFixed(4) : value.toFixed(8)}`,
                  'Preço'
                ]}
              />
              {targetPrice && (
                <ReferenceLine 
                  y={targetPrice} 
                  stroke="hsl(var(--primary))" 
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  label={{ 
                    value: `Alvo: $${targetPrice}`,
                    position: 'left',
                    fill: 'hsl(var(--primary))',
                    fontSize: 10,
                  }}
                />
              )}
              <Area
                type="monotone"
                dataKey="price"
                stroke={chartColor}
                strokeWidth={2}
                fill={`url(#gradient-${symbol})`}
                dot={false}
                activeDot={{ r: 4, fill: chartColor }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
