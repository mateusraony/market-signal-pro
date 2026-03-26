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
  return data;
}

export function useLivePrices(symbols: string[]): UseLivePricesReturn {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrices = useCallback(async () => {
    if (symbols.length === 0) return;

    try {
      const data = await fetchViaProxy('tickers', { symbols });

      const newPrices: Record<string, PriceData> = {};
      for (const ticker of data) {
        newPrices[ticker.symbol] = {
          symbol: ticker.symbol,
          price: parseFloat(ticker.lastPrice),
          change24h: parseFloat(ticker.priceChangePercent),
          lastUpdate: new Date(),
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
        lastUpdate: new Date(),
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
