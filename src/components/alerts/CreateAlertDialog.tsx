import { useState } from 'react';
import { useAlerts } from '@/hooks/useAlerts';
import { AlertType, AlertTimeframe, TriggerMode, AlertParams } from '@/types/alerts';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, DollarSign, TrendingUp, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateAlertDialogProps {
  trigger?: React.ReactNode;
}

const POPULAR_SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
  'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'LINKUSDT'
];

const EXCHANGES = ['binance', 'bybit', 'coinbase'];

const TIMEFRAMES: { value: AlertTimeframe; label: string }[] = [
  { value: '4h', label: '4 Horas' },
  { value: '1d', label: '1 Dia' },
  { value: '1w', label: '1 Semana' },
  { value: '1m', label: '1 Mês' },
];

export function CreateAlertDialog({ trigger }: CreateAlertDialogProps) {
  const { createAlert } = useAlerts();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'type' | 'config'>('type');
  const [alertType, setAlertType] = useState<AlertType | null>(null);
  
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

  const resetForm = () => {
    setStep('type');
    setAlertType(null);
    setSymbol('BTCUSDT');
    setExchange('binance');
    setTimeframe('1d');
    setMode('once');
    setTargetPrice('');
    setPriceDirection('above');
    setRsiLevel('30');
    setRsiMode('crossing');
    setMacdMode('signal_cross');
  };

  const handleCreate = async () => {
    if (!alertType) return;

    let params: AlertParams = {};
    
    if (alertType === 'price_level') {
      params = {
        target_price: parseFloat(targetPrice),
        price_direction: priceDirection,
      };
    } else if (alertType === 'rsi_level') {
      params = {
        rsi_level: parseFloat(rsiLevel),
        rsi_mode: rsiMode,
      };
    } else if (alertType === 'macd_cross') {
      params = {
        macd_mode: macdMode,
      };
    }

    await createAlert.mutateAsync({
      symbol,
      exchange,
      type: alertType,
      timeframe: alertType === 'price_level' ? null : timeframe,
      params,
      mode,
    });

    setOpen(false);
    resetForm();
  };

  const alertTypes = [
    {
      type: 'price_level' as const,
      icon: DollarSign,
      title: 'Alerta de Preço',
      description: 'Notifica quando o preço atingir um valor',
      color: 'text-primary bg-primary/10 border-primary/20',
    },
    {
      type: 'rsi_level' as const,
      icon: TrendingUp,
      title: 'Alerta de RSI',
      description: 'Notifica em níveis de RSI (30, 70, custom)',
      color: 'text-warning bg-warning/10 border-warning/20',
    },
    {
      type: 'macd_cross' as const,
      icon: BarChart3,
      title: 'Alerta de MACD',
      description: 'Notifica em cruzamentos do MACD',
      color: 'text-success bg-success/10 border-success/20',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="glow-primary">
            <Plus className="w-4 h-4 mr-2" />
            Novo Alerta
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {step === 'type' ? 'Criar Novo Alerta' : 
             alertType === 'price_level' ? 'Alerta de Preço' :
             alertType === 'rsi_level' ? 'Alerta de RSI' :
             'Alerta de MACD'}
          </DialogTitle>
          <DialogDescription>
            {step === 'type' 
              ? 'Escolha o tipo de alerta que deseja criar'
              : 'Configure os parâmetros do alerta'}
          </DialogDescription>
        </DialogHeader>

        {step === 'type' ? (
          <div className="grid gap-3 py-4">
            {alertTypes.map((item) => (
              <button
                key={item.type}
                onClick={() => {
                  setAlertType(item.type);
                  setStep('config');
                }}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-lg border text-left transition-all hover:scale-[1.02]",
                  item.color
                )}
              >
                <div className="w-12 h-12 rounded-lg bg-background/50 flex items-center justify-center">
                  <item.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm opacity-80">{item.description}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Symbol & Exchange */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Símbolo</Label>
                <Select value={symbol} onValueChange={setSymbol}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POPULAR_SYMBOLS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Exchange</Label>
                <Select value={exchange} onValueChange={setExchange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXCHANGES.map((e) => (
                      <SelectItem key={e} value={e} className="capitalize">{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Timeframe (not for price) */}
            {alertType !== 'price_level' && (
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
                        id={tf.value}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={tf.value}
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
            {alertType === 'price_level' && (
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
                          id={`price-${opt.value}`}
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={`price-${opt.value}`}
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

            {alertType === 'rsi_level' && (
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
                      <RadioGroupItem value="crossing" id="rsi-crossing" className="peer sr-only" />
                      <Label
                        htmlFor="rsi-crossing"
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
                      <RadioGroupItem value="touch" id="rsi-touch" className="peer sr-only" />
                      <Label
                        htmlFor="rsi-touch"
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

            {alertType === 'macd_cross' && (
              <div className="space-y-2">
                <Label>Tipo de Cruzamento</Label>
                <RadioGroup 
                  value={macdMode} 
                  onValueChange={(v) => setMacdMode(v as typeof macdMode)}
                  className="space-y-2"
                >
                  <div>
                    <RadioGroupItem value="signal_cross" id="macd-signal" className="peer sr-only" />
                    <Label
                      htmlFor="macd-signal"
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
                    <RadioGroupItem value="zero_cross" id="macd-zero" className="peer sr-only" />
                    <Label
                      htmlFor="macd-zero"
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

            {/* Mode */}
            <div className="space-y-2">
              <Label>Comportamento</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as TriggerMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">Disparar uma vez</SelectItem>
                  <SelectItem value="every_touch">Sempre que ocorrer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setStep('type')}
                className="flex-1"
              >
                Voltar
              </Button>
              <Button 
                onClick={handleCreate}
                disabled={createAlert.isPending}
                className="flex-1 glow-primary"
              >
                {createAlert.isPending ? 'Criando...' : 'Criar Alerta'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
