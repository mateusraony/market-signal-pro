import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

export type ExchangeType = 'binance' | 'bybit' | 'forex';

export interface SymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  exchange: ExchangeType;
  category?: 'crypto' | 'forex' | 'commodity' | 'index';
}

// Forex and commodity symbols (always available)
const FOREX_SYMBOLS: SymbolInfo[] = [
  // Commodities
  { symbol: 'XAUUSD', baseAsset: 'XAU', quoteAsset: 'USD', exchange: 'forex', category: 'commodity' },
  { symbol: 'XAGUSD', baseAsset: 'XAG', quoteAsset: 'USD', exchange: 'forex', category: 'commodity' },
  { symbol: 'WTIUSD', baseAsset: 'WTI', quoteAsset: 'USD', exchange: 'forex', category: 'commodity' },
  { symbol: 'BRENTUSD', baseAsset: 'BRENT', quoteAsset: 'USD', exchange: 'forex', category: 'commodity' },
  // Major forex pairs
  { symbol: 'EURUSD', baseAsset: 'EUR', quoteAsset: 'USD', exchange: 'forex', category: 'forex' },
  { symbol: 'GBPUSD', baseAsset: 'GBP', quoteAsset: 'USD', exchange: 'forex', category: 'forex' },
  { symbol: 'USDJPY', baseAsset: 'USD', quoteAsset: 'JPY', exchange: 'forex', category: 'forex' },
  { symbol: 'USDCHF', baseAsset: 'USD', quoteAsset: 'CHF', exchange: 'forex', category: 'forex' },
  { symbol: 'AUDUSD', baseAsset: 'AUD', quoteAsset: 'USD', exchange: 'forex', category: 'forex' },
  { symbol: 'USDCAD', baseAsset: 'USD', quoteAsset: 'CAD', exchange: 'forex', category: 'forex' },
  { symbol: 'NZDUSD', baseAsset: 'NZD', quoteAsset: 'USD', exchange: 'forex', category: 'forex' },
  // BRL pairs (Real Brasileiro) - Forex
  { symbol: 'USDBRL', baseAsset: 'USD', quoteAsset: 'BRL', exchange: 'forex', category: 'forex' },
  { symbol: 'EURBRL', baseAsset: 'EUR', quoteAsset: 'BRL', exchange: 'forex', category: 'forex' },
  { symbol: 'GBPBRL', baseAsset: 'GBP', quoteAsset: 'BRL', exchange: 'forex', category: 'forex' },
  { symbol: 'JPYBRL', baseAsset: 'JPY', quoteAsset: 'BRL', exchange: 'forex', category: 'forex' },
  { symbol: 'CHFBRL', baseAsset: 'CHF', quoteAsset: 'BRL', exchange: 'forex', category: 'forex' },
  { symbol: 'AUDBRL', baseAsset: 'AUD', quoteAsset: 'BRL', exchange: 'forex', category: 'forex' },
  { symbol: 'CADBRL', baseAsset: 'CAD', quoteAsset: 'BRL', exchange: 'forex', category: 'forex' },
  { symbol: 'NZDBRL', baseAsset: 'NZD', quoteAsset: 'BRL', exchange: 'forex', category: 'forex' },
  { symbol: 'CNYBRL', baseAsset: 'CNY', quoteAsset: 'BRL', exchange: 'forex', category: 'forex' },
  { symbol: 'ARSBRL', baseAsset: 'ARS', quoteAsset: 'BRL', exchange: 'forex', category: 'forex' },
  { symbol: 'MXNBRL', baseAsset: 'MXN', quoteAsset: 'BRL', exchange: 'forex', category: 'forex' },
  { symbol: 'XAUBRL', baseAsset: 'XAU', quoteAsset: 'BRL', exchange: 'forex', category: 'commodity' },
  // Cross pairs
  { symbol: 'EURGBP', baseAsset: 'EUR', quoteAsset: 'GBP', exchange: 'forex', category: 'forex' },
  { symbol: 'EURJPY', baseAsset: 'EUR', quoteAsset: 'JPY', exchange: 'forex', category: 'forex' },
  { symbol: 'GBPJPY', baseAsset: 'GBP', quoteAsset: 'JPY', exchange: 'forex', category: 'forex' },
  // Indices (as reference)
  { symbol: 'SPX500', baseAsset: 'SPX', quoteAsset: 'USD', exchange: 'forex', category: 'index' },
  { symbol: 'NAS100', baseAsset: 'NDX', quoteAsset: 'USD', exchange: 'forex', category: 'index' },
  { symbol: 'DJI30', baseAsset: 'DJI', quoteAsset: 'USD', exchange: 'forex', category: 'index' },
  { symbol: 'IBOV', baseAsset: 'IBOV', quoteAsset: 'BRL', exchange: 'forex', category: 'index' },
];

// Futures symbols
const FUTURES_SYMBOLS: SymbolInfo[] = [
  { symbol: 'BTCUSDT', baseAsset: 'BTC', quoteAsset: 'USDT', exchange: 'binance', category: 'crypto' },
  { symbol: 'ETHUSDT', baseAsset: 'ETH', quoteAsset: 'USDT', exchange: 'binance', category: 'crypto' },
];

// Popular crypto symbols to show by default
const DEFAULT_CRYPTO_SYMBOLS: SymbolInfo[] = [
  // USDT pairs
  { symbol: 'BTCUSDT', baseAsset: 'BTC', quoteAsset: 'USDT', exchange: 'binance', category: 'crypto' },
  { symbol: 'ETHUSDT', baseAsset: 'ETH', quoteAsset: 'USDT', exchange: 'binance', category: 'crypto' },
  { symbol: 'BNBUSDT', baseAsset: 'BNB', quoteAsset: 'USDT', exchange: 'binance', category: 'crypto' },
  { symbol: 'SOLUSDT', baseAsset: 'SOL', quoteAsset: 'USDT', exchange: 'binance', category: 'crypto' },
  { symbol: 'XRPUSDT', baseAsset: 'XRP', quoteAsset: 'USDT', exchange: 'binance', category: 'crypto' },
  { symbol: 'DOGEUSDT', baseAsset: 'DOGE', quoteAsset: 'USDT', exchange: 'binance', category: 'crypto' },
  { symbol: 'ADAUSDT', baseAsset: 'ADA', quoteAsset: 'USDT', exchange: 'binance', category: 'crypto' },
  { symbol: 'AVAXUSDT', baseAsset: 'AVAX', quoteAsset: 'USDT', exchange: 'binance', category: 'crypto' },
  { symbol: 'DOTUSDT', baseAsset: 'DOT', quoteAsset: 'USDT', exchange: 'binance', category: 'crypto' },
  { symbol: 'LINKUSDT', baseAsset: 'LINK', quoteAsset: 'USDT', exchange: 'binance', category: 'crypto' },
  { symbol: 'ENAUSDT', baseAsset: 'ENA', quoteAsset: 'USDT', exchange: 'binance', category: 'crypto' },
  { symbol: 'FETUSDT', baseAsset: 'FET', quoteAsset: 'USDT', exchange: 'binance', category: 'crypto' },
  { symbol: 'OPUSDT', baseAsset: 'OP', quoteAsset: 'USDT', exchange: 'binance', category: 'crypto' },
  { symbol: 'ARBUSDT', baseAsset: 'ARB', quoteAsset: 'USDT', exchange: 'binance', category: 'crypto' },
  { symbol: 'PEPEUSDT', baseAsset: 'PEPE', quoteAsset: 'USDT', exchange: 'binance', category: 'crypto' },
  { symbol: 'MATICUSDT', baseAsset: 'MATIC', quoteAsset: 'USDT', exchange: 'binance', category: 'crypto' },
  { symbol: 'NEARUSDT', baseAsset: 'NEAR', quoteAsset: 'USDT', exchange: 'binance', category: 'crypto' },
  { symbol: 'ATOMUSDT', baseAsset: 'ATOM', quoteAsset: 'USDT', exchange: 'binance', category: 'crypto' },
  { symbol: 'APTUSDT', baseAsset: 'APT', quoteAsset: 'USDT', exchange: 'binance', category: 'crypto' },
  { symbol: 'SUIUSDT', baseAsset: 'SUI', quoteAsset: 'USDT', exchange: 'binance', category: 'crypto' },
  // BRL pairs (Binance Brasil)
  { symbol: 'BTCBRL', baseAsset: 'BTC', quoteAsset: 'BRL', exchange: 'binance', category: 'crypto' },
  { symbol: 'ETHBRL', baseAsset: 'ETH', quoteAsset: 'BRL', exchange: 'binance', category: 'crypto' },
  { symbol: 'SOLBRL', baseAsset: 'SOL', quoteAsset: 'BRL', exchange: 'binance', category: 'crypto' },
  { symbol: 'BNBBRL', baseAsset: 'BNB', quoteAsset: 'BRL', exchange: 'binance', category: 'crypto' },
  { symbol: 'XRPBRL', baseAsset: 'XRP', quoteAsset: 'BRL', exchange: 'binance', category: 'crypto' },
  { symbol: 'USDTBRL', baseAsset: 'USDT', quoteAsset: 'BRL', exchange: 'binance', category: 'crypto' },
  { symbol: 'USDCBRL', baseAsset: 'USDC', quoteAsset: 'BRL', exchange: 'binance', category: 'crypto' },
  { symbol: 'DOGEBRL', baseAsset: 'DOGE', quoteAsset: 'BRL', exchange: 'binance', category: 'crypto' },
  { symbol: 'ADABRL', baseAsset: 'ADA', quoteAsset: 'BRL', exchange: 'binance', category: 'crypto' },
  { symbol: 'AVAXBRL', baseAsset: 'AVAX', quoteAsset: 'BRL', exchange: 'binance', category: 'crypto' },
  { symbol: 'LTCBRL', baseAsset: 'LTC', quoteAsset: 'BRL', exchange: 'binance', category: 'crypto' },
  { symbol: 'LINKBRL', baseAsset: 'LINK', quoteAsset: 'BRL', exchange: 'binance', category: 'crypto' },
  { symbol: 'MATICBRL', baseAsset: 'MATIC', quoteAsset: 'BRL', exchange: 'binance', category: 'crypto' },
  { symbol: 'DOTBRL', baseAsset: 'DOT', quoteAsset: 'BRL', exchange: 'binance', category: 'crypto' },
  { symbol: 'SHIBBRL', baseAsset: 'SHIB', quoteAsset: 'BRL', exchange: 'binance', category: 'crypto' },
  { symbol: 'PEPEBRL', baseAsset: 'PEPE', quoteAsset: 'BRL', exchange: 'binance', category: 'crypto' },
  { symbol: 'TRXBRL', baseAsset: 'TRX', quoteAsset: 'BRL', exchange: 'binance', category: 'crypto' },
  { symbol: 'BCHBRL', baseAsset: 'BCH', quoteAsset: 'BRL', exchange: 'binance', category: 'crypto' },
];

const DEFAULT_SYMBOLS: SymbolInfo[] = [...DEFAULT_CRYPTO_SYMBOLS, ...FOREX_SYMBOLS];

// Fetch all available symbols from Binance (USDT and BRL pairs)
async function fetchBinanceSymbols(): Promise<SymbolInfo[]> {
  try {
    const response = await fetch('https://api.binance.com/api/v3/exchangeInfo');
    if (!response.ok) throw new Error('Failed to fetch Binance symbols');
    
    const data = await response.json();
    
    return data.symbols
      .filter((s: any) => s.status === 'TRADING' && (s.quoteAsset === 'USDT' || s.quoteAsset === 'BRL'))
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

// Fetch all available symbols from Bybit (USDT and BRL where available)
async function fetchBybitSymbols(): Promise<SymbolInfo[]> {
  try {
    const response = await fetch('https://api.bybit.com/v5/market/instruments-info?category=spot');
    if (!response.ok) throw new Error('Failed to fetch Bybit symbols');
    
    const data = await response.json();
    
    if (data.retCode !== 0) throw new Error(data.retMsg);
    
    return data.result.list
      .filter((s: any) => s.status === 'Trading' && (s.quoteCoin === 'USDT' || s.quoteCoin === 'BRL'))
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

export function useSymbolSearch(exchange: ExchangeType | 'all' = 'all') {
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
    if (exchange === 'forex') return FOREX_SYMBOLS;
    
    // Merge and dedupe (prefer Binance if same symbol exists)
    const symbolMap = new Map<string, SymbolInfo>();
    
    // Add forex symbols first
    FOREX_SYMBOLS.forEach(s => symbolMap.set(s.symbol, s));
    
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
        if (exchange === 'forex') return d.exchange === 'forex';
        return true;
      });
      
      const others = symbols
        .filter(s => !defaultSet.has(s.symbol))
        .slice(0, 50);
      
      return [...defaults, ...others];
    }
    
    const term = searchTerm.toUpperCase();
    
    // Also search in forex symbols
    const forexMatches = FOREX_SYMBOLS.filter(s =>
      s.symbol.includes(term) || s.baseAsset.includes(term)
    );
    
    const exchangeMatches = symbols
      .filter(s => 
        s.symbol.includes(term) || 
        s.baseAsset.includes(term)
      );
    
    // Combine and dedupe
    const resultMap = new Map<string, SymbolInfo>();
    [...forexMatches, ...exchangeMatches].forEach(s => {
      if (!resultMap.has(s.symbol)) {
        resultMap.set(s.symbol, s);
      }
    });
    
    return Array.from(resultMap.values()).slice(0, 100);
  }, [allSymbols, searchTerm, exchange]);

  return {
    searchTerm,
    setSearchTerm,
    symbols: filteredSymbols(),
    isLoading: binanceQuery.isLoading || bybitQuery.isLoading,
    isError:
      exchange === 'binance' ? binanceQuery.isError :
      exchange === 'bybit' ? bybitQuery.isError :
      binanceQuery.isError || bybitQuery.isError,
    defaultSymbols: DEFAULT_SYMBOLS,
  };
}

// Hook for validating if a symbol exists
export function useValidateSymbol(symbol: string, exchange: ExchangeType) {
  return useQuery({
    queryKey: ['validate-symbol', symbol, exchange],
    queryFn: async () => {
      if (!symbol) return null;
      
      try {
        // For forex symbols, check if it's in our predefined list
        if (exchange === 'forex') {
          const isForexSymbol = FOREX_SYMBOLS.some(s => s.symbol === symbol.toUpperCase());
          if (isForexSymbol) {
            // Return valid for forex symbols (we'll fetch price from API)
            return { valid: true, price: 0 };
          }
          return null;
        }
        
        if (exchange === 'binance') {
          const response = await fetch(
            `https://api.binance.com/api/v3/ticker/price?symbol=${symbol.toUpperCase()}`
          );
          if (!response.ok) return null;
          const data = await response.json();
          return { valid: true, price: parseFloat(data.price) };
        } else if (exchange === 'bybit') {
          const response = await fetch(
            `https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol.toUpperCase()}`
          );
          if (!response.ok) return null;
          const data = await response.json();
          if (data.retCode !== 0 || !data.result.list.length) return null;
          return { valid: true, price: parseFloat(data.result.list[0].lastPrice) };
        }
        return null;
      } catch {
        return null;
      }
    },
    enabled: !!symbol && symbol.length >= 3,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Export forex symbols for use in other components
export { FOREX_SYMBOLS };
