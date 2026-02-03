import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

export interface SymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  exchange: 'binance' | 'bybit';
}

// Popular symbols to show by default
const DEFAULT_SYMBOLS: SymbolInfo[] = [
  { symbol: 'BTCUSDT', baseAsset: 'BTC', quoteAsset: 'USDT', exchange: 'binance' },
  { symbol: 'ETHUSDT', baseAsset: 'ETH', quoteAsset: 'USDT', exchange: 'binance' },
  { symbol: 'BNBUSDT', baseAsset: 'BNB', quoteAsset: 'USDT', exchange: 'binance' },
  { symbol: 'SOLUSDT', baseAsset: 'SOL', quoteAsset: 'USDT', exchange: 'binance' },
  { symbol: 'XRPUSDT', baseAsset: 'XRP', quoteAsset: 'USDT', exchange: 'binance' },
  { symbol: 'DOGEUSDT', baseAsset: 'DOGE', quoteAsset: 'USDT', exchange: 'binance' },
  { symbol: 'ADAUSDT', baseAsset: 'ADA', quoteAsset: 'USDT', exchange: 'binance' },
  { symbol: 'AVAXUSDT', baseAsset: 'AVAX', quoteAsset: 'USDT', exchange: 'binance' },
  { symbol: 'DOTUSDT', baseAsset: 'DOT', quoteAsset: 'USDT', exchange: 'binance' },
  { symbol: 'LINKUSDT', baseAsset: 'LINK', quoteAsset: 'USDT', exchange: 'binance' },
  { symbol: 'ENAUSDT', baseAsset: 'ENA', quoteAsset: 'USDT', exchange: 'binance' },
  { symbol: 'FETUSDT', baseAsset: 'FET', quoteAsset: 'USDT', exchange: 'binance' },
  { symbol: 'OPUSDT', baseAsset: 'OP', quoteAsset: 'USDT', exchange: 'binance' },
  { symbol: 'ARBUSDT', baseAsset: 'ARB', quoteAsset: 'USDT', exchange: 'binance' },
  { symbol: 'PEPEUSDT', baseAsset: 'PEPE', quoteAsset: 'USDT', exchange: 'binance' },
  { symbol: 'MATICUSDT', baseAsset: 'MATIC', quoteAsset: 'USDT', exchange: 'binance' },
  { symbol: 'NEARUSDT', baseAsset: 'NEAR', quoteAsset: 'USDT', exchange: 'binance' },
  { symbol: 'ATOMUSDT', baseAsset: 'ATOM', quoteAsset: 'USDT', exchange: 'binance' },
  { symbol: 'APTUSDT', baseAsset: 'APT', quoteAsset: 'USDT', exchange: 'binance' },
  { symbol: 'SUIUSDT', baseAsset: 'SUI', quoteAsset: 'USDT', exchange: 'binance' },
];

// Fetch all available symbols from Binance
async function fetchBinanceSymbols(): Promise<SymbolInfo[]> {
  try {
    const response = await fetch('https://api.binance.com/api/v3/exchangeInfo');
    if (!response.ok) throw new Error('Failed to fetch Binance symbols');
    
    const data = await response.json();
    
    return data.symbols
      .filter((s: any) => s.status === 'TRADING' && s.quoteAsset === 'USDT')
      .map((s: any) => ({
        symbol: s.symbol,
        baseAsset: s.baseAsset,
        quoteAsset: s.quoteAsset,
        exchange: 'binance' as const,
      }));
  } catch (error) {
    console.error('Error fetching Binance symbols:', error);
    return [];
  }
}

// Fetch all available symbols from Bybit
async function fetchBybitSymbols(): Promise<SymbolInfo[]> {
  try {
    const response = await fetch('https://api.bybit.com/v5/market/instruments-info?category=spot');
    if (!response.ok) throw new Error('Failed to fetch Bybit symbols');
    
    const data = await response.json();
    
    if (data.retCode !== 0) throw new Error(data.retMsg);
    
    return data.result.list
      .filter((s: any) => s.status === 'Trading' && s.quoteCoin === 'USDT')
      .map((s: any) => ({
        symbol: s.symbol,
        baseAsset: s.baseCoin,
        quoteAsset: s.quoteCoin,
        exchange: 'bybit' as const,
      }));
  } catch (error) {
    console.error('Error fetching Bybit symbols:', error);
    return [];
  }
}

export function useSymbolSearch(exchange: 'binance' | 'bybit' | 'all' = 'all') {
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch all symbols from Binance (cached for 5 minutes)
  const binanceQuery = useQuery({
    queryKey: ['binance-symbols'],
    queryFn: fetchBinanceSymbols,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes cache
    enabled: exchange === 'binance' || exchange === 'all',
  });

  // Fetch all symbols from Bybit (cached for 5 minutes)
  const bybitQuery = useQuery({
    queryKey: ['bybit-symbols'],
    queryFn: fetchBybitSymbols,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: exchange === 'bybit' || exchange === 'all',
  });

  // Combine and dedupe symbols
  const allSymbols = useCallback(() => {
    const binanceSymbols = binanceQuery.data ?? [];
    const bybitSymbols = bybitQuery.data ?? [];
    
    if (exchange === 'binance') return binanceSymbols;
    if (exchange === 'bybit') return bybitSymbols;
    
    // Merge and dedupe (prefer Binance if same symbol exists)
    const symbolMap = new Map<string, SymbolInfo>();
    
    binanceSymbols.forEach(s => symbolMap.set(s.symbol, s));
    bybitSymbols.forEach(s => {
      if (!symbolMap.has(s.symbol)) {
        symbolMap.set(s.symbol, s);
      }
    });
    
    return Array.from(symbolMap.values());
  }, [binanceQuery.data, bybitQuery.data, exchange]);

  // Filter symbols based on search term
  const filteredSymbols = useCallback(() => {
    const symbols = allSymbols();
    
    if (!searchTerm) {
      // Return default popular symbols first, then others
      const defaultSet = new Set(DEFAULT_SYMBOLS.map(s => s.symbol));
      const defaults = DEFAULT_SYMBOLS.filter(d => {
        if (exchange === 'binance') return d.exchange === 'binance';
        if (exchange === 'bybit') return d.exchange === 'bybit';
        return true;
      });
      
      const others = symbols
        .filter(s => !defaultSet.has(s.symbol))
        .slice(0, 50);
      
      return [...defaults, ...others];
    }
    
    const term = searchTerm.toUpperCase();
    return symbols
      .filter(s => 
        s.symbol.includes(term) || 
        s.baseAsset.includes(term)
      )
      .slice(0, 100); // Limit results for performance
  }, [allSymbols, searchTerm, exchange]);

  return {
    searchTerm,
    setSearchTerm,
    symbols: filteredSymbols(),
    isLoading: binanceQuery.isLoading || bybitQuery.isLoading,
    isError: binanceQuery.isError && bybitQuery.isError,
    defaultSymbols: DEFAULT_SYMBOLS,
  };
}

// Hook for validating if a symbol exists
export function useValidateSymbol(symbol: string, exchange: 'binance' | 'bybit') {
  return useQuery({
    queryKey: ['validate-symbol', symbol, exchange],
    queryFn: async () => {
      if (!symbol) return null;
      
      try {
        if (exchange === 'binance') {
          const response = await fetch(
            `https://api.binance.com/api/v3/ticker/price?symbol=${symbol.toUpperCase()}`
          );
          if (!response.ok) return null;
          const data = await response.json();
          return { valid: true, price: parseFloat(data.price) };
        } else {
          const response = await fetch(
            `https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol.toUpperCase()}`
          );
          if (!response.ok) return null;
          const data = await response.json();
          if (data.retCode !== 0 || !data.result.list.length) return null;
          return { valid: true, price: parseFloat(data.result.list[0].lastPrice) };
        }
      } catch {
        return null;
      }
    },
    enabled: !!symbol && symbol.length >= 3,
    staleTime: 30 * 1000, // 30 seconds
  });
}
