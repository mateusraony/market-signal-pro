import { Alert, formatAlertType, formatTimeframe, getAlertTypeColor } from '@/types/alerts';
import { formatPrice, formatToBRT } from '@/lib/format';
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
  TrendingDown, 
  BarChart3, 
  DollarSign,
  MoreVertical,
  Pause,
  Play,
  Trash2,
  Edit,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlertCardProps {
  alert: Alert;
  onTogglePause: (id: string, paused: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (alert: Alert) => void;
}

export function AlertCard({ alert, onTogglePause, onDelete, onEdit }: AlertCardProps) {
  const getTypeIcon = () => {
    switch (alert.type) {
      case 'price_level':
        return <DollarSign className="w-5 h-5" />;
      case 'rsi_level':
        return <TrendingUp className="w-5 h-5" />;
      case 'macd_cross':
        return <BarChart3 className="w-5 h-5" />;
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
    }
  };

  const tradingViewUrl = `https://www.tradingview.com/chart/?symbol=${alert.exchange.toUpperCase()}:${alert.symbol}`;

  return (
    <Card className={cn(
      "card-interactive border-border/50",
      alert.paused && "opacity-60",
      !alert.active && "opacity-40"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              alert.type === 'price_level' && "bg-primary/10 text-primary",
              alert.type === 'rsi_level' && "bg-warning/10 text-warning",
              alert.type === 'macd_cross' && "bg-success/10 text-success"
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
              <Badge variant="outline" className="text-xs">
                Inativo
              </Badge>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(alert)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onTogglePause(alert.id, !alert.paused)}>
                  {alert.paused ? (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Reativar
                    </>
                  ) : (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Pausar
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete(alert.id)}
                  className="text-destructive focus:text-destructive"
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
