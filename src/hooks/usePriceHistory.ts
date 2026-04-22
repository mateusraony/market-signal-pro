import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logClientError } from '@/lib/errorLogger';

interface PricePoint {
  time: number;
  price: number;
  formattedTime: string;
}

interface UsePriceHistoryReturn {
  priceHistory: PricePoint[];
  currentPrice: number | null;
  change24h: number | null;
  isConnected: boolean;
  high24h: number | null;
  low24h: number | null;
  lastUpdate: Date | null;
  lastError: string | null;
}

export function usePriceHistory(symbol: string, exchange?: string, maxPoints: number = 60): UsePriceHistoryReturn {
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [change24h, setChange24h] = useState<number | null>(null);
  const [high24h, setHigh24h] = useState<number | null>(null);
  const [low24h, setLow24h] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const formatTime = useCallback((date: Date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'America/Sao_Paulo',
    });
  }, []);

  const fetchPrice = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('price-proxy', {
        body: { action: 'ticker', symbol: symbol.toUpperCase(), exchange },
      });

      if (error) throw error;

      // New envelope: ok=false on logical errors (returns 200)
      if (data && data.ok === false) {
        const msg = data.error || data.code || 'Unknown proxy error';
        setLastError(msg);
        setIsConnected(false);
        logClientError({
          source: 'usePriceHistory',
          message: `price-proxy returned not ok for ${symbol}`,
          details: { code: data.code, error: data.error, status: data.status, exchange },
        });
        return;
      }

      const price = parseFloat(data.lastPrice);
      if (Number.isNaN(price)) {
        throw new Error('Invalid price payload');
      }

      // Prefer server timestamp (BRT-derivable from UTC ISO) when present
      const serverTime = data.serverTime ? new Date(data.serverTime) : new Date();

      setCurrentPrice(price);
      setChange24h(parseFloat(data.priceChangePercent));
      setHigh24h(parseFloat(data.highPrice));
      setLow24h(parseFloat(data.lowPrice));
      setIsConnected(true);
      setLastUpdate(serverTime);
      setLastError(null);

      setPriceHistory(prev => {
        const newPoint: PricePoint = {
          time: serverTime.getTime(),
          price,
          formattedTime: formatTime(serverTime),
        };
        const updated = [...prev, newPoint];
        if (updated.length > maxPoints) return updated.slice(-maxPoints);
        return updated;
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Price proxy error:', msg);
      setIsConnected(false);
      setLastError(msg);
      logClientError({
        source: 'usePriceHistory',
        message: `Fetch failed for ${symbol}`,
        details: { exchange, error: msg },
      });
    }
  }, [symbol, exchange, maxPoints, formatTime]);

  useEffect(() => {
    if (!symbol) {
      setPriceHistory([]);
      setCurrentPrice(null);
      setChange24h(null);
      setHigh24h(null);
      setLow24h(null);
      setIsConnected(false);
      setLastError(null);
      return;
    }

    fetchPrice();
    const interval = setInterval(fetchPrice, 5000);
    return () => clearInterval(interval);
  }, [symbol, fetchPrice]);

  return { priceHistory, currentPrice, change24h, isConnected, high24h, low24h, lastUpdate, lastError };
}
