import { Alert, formatAlertType, formatTimeframe, getAlertTypeColor } from '@/types/alerts';
import { formatPrice, formatToBRT, getCurrencySymbol } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  TrendingUp, 
  BarChart3, 
  DollarSign,
  MoreVertical,
  Pause,
  Play,
  Trash2,
  Edit,
  ExternalLink,
  Volume2,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLivePrice } from '@/hooks/useLivePrices';

interface AlertCardProps {
  alert: Alert;
  onTogglePause: (id: string, paused: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (alert: Alert) => void;
  onReactivate: (id: string) => void;
}

export function AlertCard({ alert, onTogglePause, onDelete, onEdit, onReactivate }: AlertCardProps) {
  const livePrice = useLivePrice(alert.symbol);

  const getTypeIcon = () => {
    switch (alert.type) {
      case 'price_level':
        return <DollarSign className="w-5 h-5" />;
      case 'rsi_level':
        return <TrendingUp className="w-5 h-5" />;
      case 'macd_cross':
        return <BarChart3 className="w-5 h-5" />;
      case 'volume_spike':
        return <Volume2 className="w-5 h-5" />;
    }
  };

  const getAlertDescription = () => {
    switch (alert.type) {
      case 'price_level':
        const dir = alert.params.price_direction;
        return `Preço ${dir === 'above' ? '≥' : dir === 'below' ? '≤' : '↔'} ${formatPrice(alert.params.target_price ?? 0)}`;
      case 'rsi_level':
        const level = alert.params.rsi_level ?? 0;
        const mode = alert.params.rsi_mode === 'crossing' ? 'cruzar' : 'tocar';
        return `RSI ${mode} ${level}`;
      case 'macd_cross':
        return alert.params.macd_mode === 'zero_cross' 
          ? 'MACD cruzar linha zero' 
          : 'MACD cruzar Signal';
      case 'volume_spike':
        return `Volume > ${alert.params.volume_threshold ?? 200}% da média`;
    }
  };

  const tradingViewUrl = `https://www.tradingview.com/chart/?symbol=${alert.exchange.toUpperCase()}:${alert.symbol}`;

  return (
    <Card className={cn(
      "card-interactive border-border/50 relative",
      alert.paused && "opacity-70",
      !alert.active && "opacity-60 bg-muted/30"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              alert.type === 'price_level' && "bg-primary/10 text-primary",
              alert.type === 'rsi_level' && "bg-warning/10 text-warning",
              alert.type === 'macd_cross' && "bg-success/10 text-success",
              alert.type === 'volume_spike' && "bg-purple-500/10 text-purple-500"
            )}>
              {getTypeIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold font-mono text-lg">{alert.symbol}</h3>
                <a 
                  href={tradingViewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <p className="text-xs text-muted-foreground capitalize">{alert.exchange}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {alert.paused ? (
              <Badge variant="secondary" className="text-xs">
                Pausado
              </Badge>
            ) : alert.active ? (
              <Badge className="bg-success/20 text-success border-success/30 text-xs">
                Ativo
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                Disparado
              </Badge>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-accent">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-50">
                <DropdownMenuItem 
                  onClick={() => onEdit(alert)}
                  className="cursor-pointer"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                {!alert.active && (
                  <DropdownMenuItem 
                    onClick={() => onReactivate(alert.id)}
                    className="cursor-pointer text-success"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reativar Alerta
                  </DropdownMenuItem>
                )}
                {alert.active && (
                  <DropdownMenuItem 
                    onClick={() => onTogglePause(alert.id, !alert.paused)}
                    className="cursor-pointer"
                  >
                    {alert.paused ? (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Retomar
                      </>
                    ) : (
                      <>
                        <Pause className="w-4 h-4 mr-2" />
                        Pausar
                      </>
                    )}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onClick={() => onDelete(alert.id)}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Live Price */}
        {livePrice && (
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
            <span className="text-sm text-muted-foreground">Preço atual:</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold">{formatPrice(livePrice.price)}</span>
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs font-mono",
                  livePrice.change24h >= 0 
                    ? "text-success border-success/30" 
                    : "text-destructive border-destructive/30"
                )}
              >
                {livePrice.change24h >= 0 ? '+' : ''}{livePrice.change24h.toFixed(2)}%
              </Badge>
            </div>
          </div>
        )}

        {/* Alert condition */}
        <div className="p-3 rounded-lg bg-muted/50">
          <p className={cn("font-medium", getAlertTypeColor(alert.type))}>
            {getAlertDescription()}
          </p>
          {alert.timeframe && (
            <p className="text-sm text-muted-foreground mt-1">
              Timeframe: {formatTimeframe(alert.timeframe)}
            </p>
          )}
        </div>

        {/* Tags */}
        {alert.tags && alert.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {alert.tags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Criado: {formatToBRT(alert.created_at)}</span>
          <span className="capitalize">
            Modo: {alert.mode === 'once' ? 'Uma vez' : 
                   alert.mode === 'every_touch' ? 'Sempre' :
                   alert.mode === 'crossing' ? 'Cruzamento' : 'Toque'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
