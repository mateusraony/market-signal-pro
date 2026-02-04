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

  const formatTime = useCallback((date: Date) => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  }, []);

  useEffect(() => {
    if (!symbol) return;

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = new WebSocket(
      `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@ticker`
    );

    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
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
        // Keep only last maxPoints
        if (updated.length > maxPoints) {
          return updated.slice(-maxPoints);
        }
        return updated;
      });
    };

    ws.onerror = () => {
      setIsConnected(false);
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [symbol, maxPoints, formatTime]);

  return { priceHistory, currentPrice, change24h, isConnected, high24h, low24h };
}
