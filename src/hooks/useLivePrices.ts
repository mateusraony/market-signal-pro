import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  lastUpdate: Date;
}

interface UseLivePricesReturn {
  prices: Record<string, PriceData>;
  isConnected: boolean;
  error: string | null;
}

async function fetchViaProxy(action: string, params: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('price-proxy', {
    body: { action, ...params },
  });
  if (error) throw new Error(error.message);
  if (data?.ok === false) throw new Error(data.error || data.code || 'Erro ao carregar preço');
  return data?.data ?? data;
}

export function useLivePrices(symbols: string[]): UseLivePricesReturn {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrices = useCallback(async () => {
    if (symbols.length === 0) return;

    try {
      const data = await fetchViaProxy('tickers', { symbols });
      const tickers = Array.isArray(data) ? data : [];

      const newPrices: Record<string, PriceData> = {};
      for (const ticker of tickers) {
        newPrices[ticker.symbol] = {
          symbol: ticker.symbol,
          price: parseFloat(ticker.lastPrice),
          change24h: parseFloat(ticker.priceChangePercent),
          lastUpdate: ticker.serverTime ? new Date(ticker.serverTime) : new Date(),
        };
      }

      setPrices(newPrices);
      setIsConnected(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsConnected(false);
    }
  }, [symbols]);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 5000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  return { prices, isConnected, error };
}

// Hook for single symbol - uses proxy with polling
export function useLivePrice(symbol: string): PriceData | null {
  const [price, setPrice] = useState<PriceData | null>(null);

  const fetchPrice = useCallback(async () => {
    if (!symbol) return;
    try {
      const data = await fetchViaProxy('ticker', { symbol: symbol.toUpperCase() });
      setPrice({
        symbol: data.symbol,
        price: parseFloat(data.lastPrice),
        change24h: parseFloat(data.priceChangePercent),
        lastUpdate: data.serverTime ? new Date(data.serverTime) : new Date(),
      });
    } catch (error) {
      console.error('Price proxy error for', symbol, error);
    }
  }, [symbol]);

  useEffect(() => {
    if (!symbol) return;
    fetchPrice();
    const interval = setInterval(fetchPrice, 5000);
    return () => clearInterval(interval);
  }, [symbol, fetchPrice]);

  return price;
}
