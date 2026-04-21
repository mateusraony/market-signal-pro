import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
}

export function usePriceHistory(symbol: string, exchange?: string, maxPoints: number = 60): UsePriceHistoryReturn {
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [change24h, setChange24h] = useState<number | null>(null);
  const [high24h, setHigh24h] = useState<number | null>(null);
  const [low24h, setLow24h] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const formatTime = useCallback((date: Date) => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  }, []);

  const fetchPrice = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('price-proxy', {
        body: { action: 'ticker', symbol: symbol.toUpperCase(), exchange },
      });

      if (error) throw error;

      const price = parseFloat(data.lastPrice);
      const now = new Date();

      setCurrentPrice(price);
      setChange24h(parseFloat(data.priceChangePercent));
      setHigh24h(parseFloat(data.highPrice));
      setLow24h(parseFloat(data.lowPrice));
      setIsConnected(true);
      setLastUpdate(now);

      setPriceHistory(prev => {
        const newPoint: PricePoint = {
          time: now.getTime(),
          price,
          formattedTime: formatTime(now),
        };

        const updated = [...prev, newPoint];
        if (updated.length > maxPoints) {
          return updated.slice(-maxPoints);
        }
        return updated;
      });
    } catch (error) {
      console.error('Price proxy error:', error);
      setIsConnected(false);
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
      return;
    }

    fetchPrice();
    const interval = setInterval(fetchPrice, 5000);
    return () => clearInterval(interval);
  }, [symbol, fetchPrice]);

  return { priceHistory, currentPrice, change24h, isConnected, high24h, low24h, lastUpdate };
}
