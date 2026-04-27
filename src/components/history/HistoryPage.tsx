import { useState } from 'react';
import { useAlertsHistory } from '@/hooks/useAlertsHistory';
import { AlertHistory, AlertType, AlertTimeframe, formatAlertType, formatTimeframe } from '@/types/alerts';
import { formatBRTTooltip, formatToBRT, formatRelativeTime, formatPrice, formatRSI, formatProbability, getRSIColor, getDirectionColor } from '@/lib/format';
import { exportHistoryToCSV } from '@/lib/exportCSV';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  History, 
  Search, 
  Filter, 
  TrendingUp, 
  TrendingDown,
  Clock,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function HistoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterTimeframe, setFilterTimeframe] = useState<string>('all');
  const [filterMode, setFilterMode] = useState<string>('all'); // all | realtime | retroactive

  const { data: history, isLoading } = useAlertsHistory({
    symbol: searchTerm || undefined,
    type: filterType !== 'all' ? filterType as AlertType : undefined,
    timeframe: filterTimeframe !== 'all' ? filterTimeframe as AlertTimeframe : undefined,
    retroactive: filterMode === 'all' ? undefined : filterMode === 'retroactive',
  });

  // Time-window stats (1h, 24h, 7d) - based on current filtered dataset
  const now = Date.now();
  const inWindow = (iso: string, ms: number) => now - new Date(iso).getTime() <= ms;
  const last1h = history?.filter(h => inWindow(h.event_time_utc, 60 * 60 * 1000)).length ?? 0;
  const last24h = history?.filter(h => inWindow(h.event_time_utc, 24 * 60 * 60 * 1000)).length ?? 0;
  const last7d = history?.filter(h => inWindow(h.event_time_utc, 7 * 24 * 60 * 60 * 1000)).length ?? 0;

  const getDirectionIcon = (direction: string | null) => {
    if (direction === 'up') return <TrendingUp className="w-4 h-4 text-success" />;
    if (direction === 'down') return <TrendingDown className="w-4 h-4 text-destructive" />;
    return null;
  };

  const handleExportCSV = () => {
    if (!history || history.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }
    exportHistoryToCSV(history);
    toast.success('Arquivo CSV exportado com sucesso!');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <History className="w-6 h-6 text-primary" />
            Histórico de Alertas
          </h1>
          <p className="text-muted-foreground mt-1">
            Visualize todos os alertas disparados
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleExportCSV}
          disabled={!history || history.length === 0}
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Time-window stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Últimas 1h</p>
            <p className="text-2xl font-bold font-mono text-primary">{last1h}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Últimas 24h</p>
            <p className="text-2xl font-bold font-mono text-primary">{last24h}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Últimos 7d</p>
            <p className="text-2xl font-bold font-mono text-primary">{last7d}</p>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold font-mono">{history?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-success/5 border-success/20">
          <CardContent className="p-4">
            <p className="text-sm text-success">Bullish</p>
            <p className="text-2xl font-bold font-mono text-success">
              {history?.filter(h => h.direction_guess === 'up').length ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-destructive/5 border-destructive/20">
          <CardContent className="p-4">
            <p className="text-sm text-destructive">Bearish</p>
            <p className="text-2xl font-bold font-mono text-destructive">
              {history?.filter(h => h.direction_guess === 'down').length ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-warning/5 border-warning/20">
          <CardContent className="p-4">
            <p className="text-sm text-warning">Retroativos</p>
            <p className="text-2xl font-bold font-mono text-warning">
              {history?.filter(h => h.retroactive).length ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por símbolo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="price_level">Preço</SelectItem>
            <SelectItem value="rsi_level">RSI</SelectItem>
            <SelectItem value="macd_cross">MACD</SelectItem>
            <SelectItem value="volume_spike">Volume</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterTimeframe} onValueChange={setFilterTimeframe}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="4h">4H</SelectItem>
            <SelectItem value="1d">1D</SelectItem>
            <SelectItem value="1w">1W</SelectItem>
            <SelectItem value="1m">1M</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterMode} onValueChange={setFilterMode}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Modo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os modos</SelectItem>
            <SelectItem value="realtime">Tempo real</SelectItem>
            <SelectItem value="retroactive">Retroativos (backfill)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {!history || history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 rounded-xl border border-dashed border-border bg-card/50">
          <History className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">Nenhum registro</h3>
          <p className="text-muted-foreground text-center max-w-sm">
            O histórico aparecerá aqui quando seus alertas forem disparados
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Símbolo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Timeframe</TableHead>
                <TableHead>Horário (BRT)</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>RSI</TableHead>
                <TableHead>Direção</TableHead>
                <TableHead>Prob.</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((item) => (
                <TableRow key={item.id} className="table-row-highlight">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold">{item.symbol}</span>
                      {item.retroactive && (
                        <Badge variant="outline" className="text-xs text-warning border-warning/30">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Retroativo
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn(
                      item.type === 'price_level' && 'text-primary border-primary/30',
                      item.type === 'rsi_level' && 'text-warning border-warning/30',
                      item.type === 'macd_cross' && 'text-success border-success/30',
                      item.type === 'volume_spike' && 'text-primary border-primary/30',
                    )}>
                      {formatAlertType(item.type)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatTimeframe(item.timeframe)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <div>
                        <p className="font-mono text-sm" title={`Acionado em ${formatBRTTooltip(item.event_time_utc)} · Detectado em ${formatBRTTooltip(item.detected_time_utc)}`}>
                          {formatToBRT(item.event_time_utc)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeTime(item.event_time_utc)}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">
                    {formatPrice(item.price_at_event)}
                  </TableCell>
                  <TableCell className={cn("font-mono", getRSIColor(item.rsi_at_event))}>
                    {formatRSI(item.rsi_at_event)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getDirectionIcon(item.direction_guess)}
                      <span className={cn(
                        "capitalize",
                        getDirectionColor(item.direction_guess)
                      )}>
                        {item.direction_guess === 'up' ? 'Alta' :
                         item.direction_guess === 'down' ? 'Baixa' : 'Neutro'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.prob_up !== null && (
                      <div className="text-xs">
                        <span className="text-success">{formatProbability(item.prob_up)}</span>
                        {' / '}
                        <span className="text-destructive">{formatProbability(item.prob_down)}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <a
                      href={`https://www.tradingview.com/chart/?symbol=${item.exchange.toUpperCase()}:${item.symbol}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
