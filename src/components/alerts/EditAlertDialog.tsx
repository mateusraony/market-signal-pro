import { useState, useEffect } from 'react';
import { useAlerts } from '@/hooks/useAlerts';
import { Alert, AlertType, AlertTimeframe, TriggerMode, AlertParams } from '@/types/alerts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DollarSign, TrendingUp, BarChart3, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { SymbolSearchCombobox } from './SymbolSearchCombobox';
import type { ExchangeType } from '@/hooks/useSymbolSearch';

interface EditAlertDialogProps {
  alert: Alert | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TIMEFRAMES: { value: AlertTimeframe; label: string }[] = [
  { value: '4h', label: '4 Horas' },
  { value: '1d', label: '1 Dia' },
  { value: '1w', label: '1 Semana' },
  { value: '1m', label: '1 Mês' },
];

export function EditAlertDialog({ alert, open, onOpenChange }: EditAlertDialogProps) {
  const { updateAlert } = useAlerts();
  
  // Form state
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [exchange, setExchange] = useState('binance');
  const [timeframe, setTimeframe] = useState<AlertTimeframe>('1d');
  const [mode, setMode] = useState<TriggerMode>('once');
  
  // Price params
  const [targetPrice, setTargetPrice] = useState('');
  const [priceDirection, setPriceDirection] = useState<'above' | 'below' | 'cross'>('above');
  
  // RSI params
  const [rsiLevel, setRsiLevel] = useState('30');
  const [rsiMode, setRsiMode] = useState<'crossing' | 'touch'>('crossing');
  
  // MACD params
  const [macdMode, setMacdMode] = useState<'signal_cross' | 'zero_cross'>('signal_cross');
  
  // Volume params
  const [volumeThreshold, setVolumeThreshold] = useState('200');
  const [volumePeriod, setVolumePeriod] = useState('20');

  const validateNumber = (
    value: string,
    fieldLabel: string,
    options: { min?: number; max?: number } = {}
  ): number | null => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      toast.error(`${fieldLabel} inválido.`);
      return null;
    }
    if (options.min !== undefined && parsed < options.min) {
      toast.error(`${fieldLabel} deve ser maior ou igual a ${options.min}.`);
      return null;
    }
    if (options.max !== undefined && parsed > options.max) {
      toast.error(`${fieldLabel} deve ser menor ou igual a ${options.max}.`);
      return null;
    }
    return parsed;
  };

  // Load alert data when it changes
  useEffect(() => {
    if (alert) {
      setSymbol(alert.symbol);
      setExchange(alert.exchange);
      setTimeframe(alert.timeframe || '1d');
      setMode(alert.mode);
      
      if (alert.type === 'price_level') {
        setTargetPrice(String(alert.params.target_price || ''));
        setPriceDirection(alert.params.price_direction || 'above');
      } else if (alert.type === 'rsi_level') {
        setRsiLevel(String(alert.params.rsi_level || '30'));
        setRsiMode(alert.params.rsi_mode || 'crossing');
      } else if (alert.type === 'macd_cross') {
        setMacdMode(alert.params.macd_mode || 'signal_cross');
      } else if (alert.type === 'volume_spike') {
        setVolumeThreshold(String(alert.params.volume_threshold || '200'));
        setVolumePeriod(String(alert.params.volume_period || '20'));
      }
    }
  }, [alert]);

  const handleUpdate = async () => {
    if (!alert) return;

    let params: AlertParams = {};
    
    if (alert.type === 'price_level') {
      const parsedTargetPrice = validateNumber(targetPrice, 'Preço alvo', { min: 0.00000001 });
      if (parsedTargetPrice === null) return;
      params = {
        target_price: parsedTargetPrice,
        price_direction: priceDirection,
      };
    } else if (alert.type === 'rsi_level') {
      const parsedRsiLevel = validateNumber(rsiLevel, 'Nível RSI', { min: 0, max: 100 });
      if (parsedRsiLevel === null) return;
      params = {
        rsi_level: parsedRsiLevel,
        rsi_mode: rsiMode,
      };
    } else if (alert.type === 'macd_cross') {
      params = {
        macd_mode: macdMode,
      };
    } else if (alert.type === 'volume_spike') {
      const parsedVolumeThreshold = validateNumber(volumeThreshold, 'Threshold de volume', { min: 1 });
      const parsedVolumePeriod = validateNumber(volumePeriod, 'Período de volume', { min: 1 });
      if (parsedVolumeThreshold === null || parsedVolumePeriod === null) return;
      if (!Number.isInteger(parsedVolumePeriod)) {
        toast.error('Período de volume deve ser um número inteiro.');
        return;
      }
      params = {
        volume_threshold: parsedVolumeThreshold,
        volume_period: parsedVolumePeriod,
      };
    }

    await updateAlert.mutateAsync({
      id: alert.id,
      symbol,
      exchange,
      timeframe: alert.type === 'price_level' ? null : timeframe,
      params,
      mode,
    });

    onOpenChange(false);
  };

  const getTypeIcon = () => {
    if (!alert) return null;
    switch (alert.type) {
      case 'price_level':
        return <DollarSign className="w-5 h-5 text-primary" />;
      case 'rsi_level':
        return <TrendingUp className="w-5 h-5 text-warning" />;
      case 'macd_cross':
        return <BarChart3 className="w-5 h-5 text-success" />;
      case 'volume_spike':
        return <Volume2 className="w-5 h-5 text-purple-500" />;
    }
  };

  const getTypeLabel = () => {
    if (!alert) return '';
    switch (alert.type) {
      case 'price_level': return 'Alerta de Preço';
      case 'rsi_level': return 'Alerta de RSI';
      case 'macd_cross': return 'Alerta de MACD';
      case 'volume_spike': return 'Alerta de Volume';
    }
  };

  if (!alert) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getTypeIcon()}
            Editar {getTypeLabel()}
          </DialogTitle>
          <DialogDescription>
            Modifique os parâmetros do alerta
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Symbol & Exchange */}
          <div className="space-y-2">
            <Label>Símbolo</Label>
            <SymbolSearchCombobox
              value={symbol}
              exchange={exchange as ExchangeType}
              onValueChange={setSymbol}
              onExchangeChange={(e) => setExchange(e)}
            />
            <p className="text-xs text-muted-foreground">
              Busca dinâmica em Binance, Bybit e Forex (incluindo pares BRL).
            </p>
          </div>

          {/* Timeframe (not for price) */}
          {alert.type !== 'price_level' && (
            <div className="space-y-2">
              <Label>Timeframe</Label>
              <RadioGroup 
                value={timeframe} 
                onValueChange={(v) => setTimeframe(v as AlertTimeframe)}
                className="flex gap-2"
              >
                {TIMEFRAMES.map((tf) => (
                  <div key={tf.value} className="flex-1">
                    <RadioGroupItem
                      value={tf.value}
                      id={`edit-${tf.value}`}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`edit-${tf.value}`}
                      className={cn(
                        "flex items-center justify-center px-3 py-2 rounded-lg border cursor-pointer transition-all",
                        "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10",
                        "hover:bg-muted"
                      )}
                    >
                      {tf.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Type-specific params */}
          {alert.type === 'price_level' && (
            <>
              <div className="space-y-2">
                <Label>Preço Alvo</Label>
                <Input
                  type="number"
                  placeholder="Ex: 50000"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label>Condição</Label>
                <RadioGroup 
                  value={priceDirection} 
                  onValueChange={(v) => setPriceDirection(v as typeof priceDirection)}
                  className="flex gap-2"
                >
                  {[
                    { value: 'above', label: 'Acima de' },
                    { value: 'below', label: 'Abaixo de' },
                    { value: 'cross', label: 'Cruzar' },
                  ].map((opt) => (
                    <div key={opt.value} className="flex-1">
                      <RadioGroupItem
                        value={opt.value}
                        id={`edit-price-${opt.value}`}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={`edit-price-${opt.value}`}
                        className={cn(
                          "flex items-center justify-center px-3 py-2 rounded-lg border cursor-pointer transition-all",
                          "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10",
                          "hover:bg-muted"
                        )}
                      >
                        {opt.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </>
          )}

          {alert.type === 'rsi_level' && (
            <>
              <div className="space-y-2">
                <Label>Nível RSI</Label>
                <div className="flex gap-2">
                  {['30', '50', '70'].map((level) => (
                    <Button
                      key={level}
                      type="button"
                      variant={rsiLevel === level ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setRsiLevel(level)}
                    >
                      {level}
                    </Button>
                  ))}
                  <Input
                    type="number"
                    placeholder="Custom"
                    value={!['30', '50', '70'].includes(rsiLevel) ? rsiLevel : ''}
                    onChange={(e) => setRsiLevel(e.target.value)}
                    className="flex-1 font-mono"
                    min="0"
                    max="100"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Modo de Disparo</Label>
                <RadioGroup 
                  value={rsiMode} 
                  onValueChange={(v) => setRsiMode(v as typeof rsiMode)}
                  className="flex gap-2"
                >
                  <div className="flex-1">
                    <RadioGroupItem value="crossing" id="edit-rsi-crossing" className="peer sr-only" />
                    <Label
                      htmlFor="edit-rsi-crossing"
                      className={cn(
                        "flex flex-col items-center p-3 rounded-lg border cursor-pointer transition-all",
                        "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10",
                        "hover:bg-muted"
                      )}
                    >
                      <span className="font-medium">Cruzamento</span>
                      <span className="text-xs text-muted-foreground">Apenas ao cruzar</span>
                    </Label>
                  </div>
                  <div className="flex-1">
                    <RadioGroupItem value="touch" id="edit-rsi-touch" className="peer sr-only" />
                    <Label
                      htmlFor="edit-rsi-touch"
                      className={cn(
                        "flex flex-col items-center p-3 rounded-lg border cursor-pointer transition-all",
                        "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10",
                        "hover:bg-muted"
                      )}
                    >
                      <span className="font-medium">Toque</span>
                      <span className="text-xs text-muted-foreground">Sempre que tocar</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </>
          )}

          {alert.type === 'macd_cross' && (
            <div className="space-y-2">
              <Label>Tipo de Cruzamento</Label>
              <RadioGroup 
                value={macdMode} 
                onValueChange={(v) => setMacdMode(v as typeof macdMode)}
                className="space-y-2"
              >
                <div>
                  <RadioGroupItem value="signal_cross" id="edit-macd-signal" className="peer sr-only" />
                  <Label
                    htmlFor="edit-macd-signal"
                    className={cn(
                      "flex flex-col p-4 rounded-lg border cursor-pointer transition-all",
                      "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10",
                      "hover:bg-muted"
                    )}
                  >
                    <span className="font-medium">MACD × Signal Line</span>
                    <span className="text-sm text-muted-foreground">
                      Cruzamento entre MACD Line e Signal Line
                    </span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="zero_cross" id="edit-macd-zero" className="peer sr-only" />
                  <Label
                    htmlFor="edit-macd-zero"
                    className={cn(
                      "flex flex-col p-4 rounded-lg border cursor-pointer transition-all",
                      "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10",
                      "hover:bg-muted"
                    )}
                  >
                    <span className="font-medium">MACD × Zero</span>
                    <span className="text-sm text-muted-foreground">
                      Cruzamento da linha zero
                    </span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {alert.type === 'volume_spike' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Limiar de Volume (%)</Label>
                <div className="flex gap-2">
                  {['150', '200', '300'].map((level) => (
                    <Button
                      key={level}
                      type="button"
                      variant={volumeThreshold === level ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setVolumeThreshold(level)}
                    >
                      {level}%
                    </Button>
                  ))}
                  <Input
                    type="number"
                    placeholder="Custom"
                    value={!['150', '200', '300'].includes(volumeThreshold) ? volumeThreshold : ''}
                    onChange={(e) => setVolumeThreshold(e.target.value)}
                    className="flex-1 font-mono"
                    min="100"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Período de Média (candles)</Label>
                <div className="flex gap-2">
                  {['10', '20', '50'].map((period) => (
                    <Button
                      key={period}
                      type="button"
                      variant={volumePeriod === period ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setVolumePeriod(period)}
                    >
                      {period}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Trigger mode */}
          <div className="space-y-2">
            <Label>Modo de Gatilho</Label>
            <RadioGroup 
              value={mode} 
              onValueChange={(v) => setMode(v as TriggerMode)}
              className="grid grid-cols-2 gap-2"
            >
              {[
                { value: 'once', label: 'Uma vez', desc: 'Dispara apenas uma vez' },
                { value: 'every_touch', label: 'Sempre', desc: 'Dispara toda vez' },
              ].map((opt) => (
                <div key={opt.value}>
                  <RadioGroupItem
                    value={opt.value}
                    id={`edit-mode-${opt.value}`}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`edit-mode-${opt.value}`}
                    className={cn(
                      "flex flex-col p-3 rounded-lg border cursor-pointer transition-all",
                      "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10",
                      "hover:bg-muted"
                    )}
                  >
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-xs text-muted-foreground">{opt.desc}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleUpdate}
              disabled={updateAlert.isPending}
              className="glow-primary"
            >
              {updateAlert.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
