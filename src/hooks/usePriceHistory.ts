import { useState, useEffect, useCallback, useRef } from 'react';

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
}

export function usePriceHistory(symbol: string, maxPoints: number = 60): UsePriceHistoryReturn {
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [change24h, setChange24h] = useState<number | null>(null);
  const [high24h, setHigh24h] = useState<number | null>(null);
  const [low24h, setLow24h] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const wsFailedRef = useRef(false);

  const formatTime = useCallback((date: Date) => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  }, []);

  // Fallback REST API polling
  const fetchPriceViaREST = useCallback(async () => {
    try {
      const response = await fetch(
        `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol.toUpperCase()}`
      );
      
      if (!response.ok) return;
      
      const data = await response.json();
      const price = parseFloat(data.lastPrice);
      const now = new Date();
      
      setCurrentPrice(price);
      setChange24h(parseFloat(data.priceChangePercent));
      setHigh24h(parseFloat(data.highPrice));
      setLow24h(parseFloat(data.lowPrice));
      setIsConnected(true);
      
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
      console.error('REST API error:', error);
    }
  }, [symbol, maxPoints, formatTime]);

  useEffect(() => {
    if (!symbol) return;

    // Close existing connections
    if (wsRef.current) {
      wsRef.current.close();
    }
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
    }
    
    wsFailedRef.current = false;

    const ws = new WebSocket(
      `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@ticker`
    );

    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      wsFailedRef.current = false;
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const price = parseFloat(data.c);
      const now = new Date();
      
      setCurrentPrice(price);
      setChange24h(parseFloat(data.P));
      setHigh24h(parseFloat(data.h));
      setLow24h(parseFloat(data.l));
      
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
    };

    ws.onerror = () => {
      console.log(`WebSocket error for ${symbol}, falling back to REST API`);
      wsFailedRef.current = true;
      // Start REST polling as fallback
      fetchPriceViaREST();
      fallbackIntervalRef.current = setInterval(fetchPriceViaREST, 3000);
    };

    ws.onclose = () => {
      if (!wsFailedRef.current) {
        setIsConnected(false);
      }
    };

    return () => {
      ws.close();
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
      }
    };
  }, [symbol, maxPoints, formatTime, fetchPriceViaREST]);

  return { priceHistory, currentPrice, change24h, isConnected, high24h, low24h };
}
