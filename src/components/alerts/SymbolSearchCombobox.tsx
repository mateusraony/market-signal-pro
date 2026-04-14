import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useSymbolSearch, useValidateSymbol, ExchangeType } from '@/hooks/useSymbolSearch';
import { Badge } from '@/components/ui/badge';

interface SymbolSearchComboboxProps {
  value: string;
  exchange: ExchangeType;
  onValueChange: (value: string) => void;
  onExchangeChange?: (exchange: ExchangeType) => void;
}

export function SymbolSearchCombobox({
  value,
  exchange,
  onValueChange,
  onExchangeChange,
}: SymbolSearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  
  const { symbols, isLoading, setSearchTerm } = useSymbolSearch('all');
  const validation = useValidateSymbol(inputValue, exchange);

  useEffect(() => {
    setSearchTerm(inputValue);
  }, [inputValue, setSearchTerm]);

  const handleSelect = (symbol: string, symbolExchange: ExchangeType) => {
    onValueChange(symbol);
    if (onExchangeChange) {
      onExchangeChange(symbolExchange);
    }
    setInputValue('');
    setOpen(false);
  };

  const handleCustomSymbol = () => {
    if (inputValue && validation.data?.valid) {
      onValueChange(inputValue.toUpperCase());
      setInputValue('');
      setOpen(false);
    }
  };

  const showCustomOption = inputValue && 
    !symbols.find(s => s.symbol === inputValue.toUpperCase()) &&
    inputValue.length >= 3;

  const getExchangeBadgeStyle = (ex: ExchangeType) => {
    switch (ex) {
      case 'binance':
        return 'text-yellow-500 border-yellow-500/30';
      case 'bybit':
        return 'text-orange-500 border-orange-500/30';
      case 'forex':
        return 'text-emerald-500 border-emerald-500/30';
      default:
        return 'text-muted-foreground border-border';
    }
  };

  const getCategoryLabel = (category?: string) => {
    switch (category) {
      case 'commodity':
        return '🥇';
      case 'forex':
        return '💱';
      case 'index':
        return '📊';
      default:
        return '';
    }
  };

  // Group symbols by category
  const cryptoSymbols = symbols.filter(s => s.exchange !== 'forex');
  const forexSymbols = symbols.filter(s => s.exchange === 'forex');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-mono"
        >
          <span className="flex items-center gap-2">
            {value || 'Selecione um símbolo...'}
            {value && (
              <Badge variant="outline" className={cn("text-xs", getExchangeBadgeStyle(exchange))}>
                {exchange}
              </Badge>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value.toUpperCase())}
              placeholder="Buscar: BTC, XAU, EUR..."
              className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
          <CommandList className="max-h-[350px]">
            {showCustomOption && (
              <CommandGroup heading="Símbolo personalizado">
                <CommandItem
                  onSelect={handleCustomSymbol}
                  disabled={validation.isLoading || !validation.data?.valid}
                  className="flex items-center justify-between"
                >
                  <span className="font-mono">{inputValue.toUpperCase()}</span>
                  {validation.isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : validation.data?.valid ? (
                    <Badge variant="outline" className="text-success border-success/30">
                      ${validation.data.price.toLocaleString()}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-destructive border-destructive/30">
                      Não encontrado
                    </Badge>
                  )}
                </CommandItem>
              </CommandGroup>
            )}
            
            {symbols.length === 0 && !showCustomOption && (
              <CommandEmpty>
                {isLoading ? 'Carregando símbolos...' : 'Nenhum símbolo encontrado.'}
              </CommandEmpty>
            )}
            
            {/* Forex & Commodities */}
            {forexSymbols.length > 0 && (
              <CommandGroup heading="Forex & Commodities">
                {forexSymbols.slice(0, 20).map((symbol) => (
                  <CommandItem
                    key={`${symbol.exchange}-${symbol.symbol}`}
                    value={symbol.symbol}
                    onSelect={() => handleSelect(symbol.symbol, symbol.exchange)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Check
                        className={cn(
                          "h-4 w-4",
                          value === symbol.symbol ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="font-mono">{symbol.symbol}</span>
                      <span className="text-xs">{getCategoryLabel(symbol.category)}</span>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs", getExchangeBadgeStyle(symbol.exchange))}
                    >
                      {symbol.category === 'commodity' ? 'Commodity' : 
                       symbol.category === 'index' ? 'Índice' : 'Forex'}
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Crypto */}
            {cryptoSymbols.length > 0 && (
              <CommandGroup heading="Criptomoedas">
                {cryptoSymbols.slice(0, 30).map((symbol) => (
                  <CommandItem
                    key={`${symbol.exchange}-${symbol.symbol}`}
                    value={symbol.symbol}
                    onSelect={() => handleSelect(symbol.symbol, symbol.exchange)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Check
                        className={cn(
                          "h-4 w-4",
                          value === symbol.symbol ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="font-mono">{symbol.symbol}</span>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs", getExchangeBadgeStyle(symbol.exchange))}
                    >
                      {symbol.exchange}
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
        
        {onExchangeChange && (
          <div className="flex border-t p-2 gap-1">
            <Button
              variant={exchange === 'binance' ? 'default' : 'ghost'}
              size="sm"
              className="flex-1 text-xs"
              onClick={() => onExchangeChange('binance')}
            >
              Binance
            </Button>
            <Button
              variant={exchange === 'bybit' ? 'default' : 'ghost'}
              size="sm"
              className="flex-1 text-xs"
              onClick={() => onExchangeChange('bybit')}
            >
              Bybit
            </Button>
            <Button
              variant={exchange === 'forex' ? 'default' : 'ghost'}
              size="sm"
              className="flex-1 text-xs"
              onClick={() => onExchangeChange('forex')}
            >
              Forex
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
