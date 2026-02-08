import { useState, useEffect, useCallback, useRef } from 'react';

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

export function useLivePrices(symbols: string[]): UseLivePricesReturn {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrices = useCallback(async () => {
    if (symbols.length === 0) return;

    try {
      // Fetch ticker data for all symbols
      const symbolsParam = symbols.map(s => `"${s.toUpperCase()}"`).join(',');
      const response = await fetch(
        `https://api.binance.com/api/v3/ticker/24hr?symbols=[${symbolsParam}]`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch prices');
      }

      const data = await response.json();
      
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
    
    // Refresh every 5 seconds
    const interval = setInterval(fetchPrices, 5000);
    
    return () => clearInterval(interval);
  }, [fetchPrices]);

  return { prices, isConnected, error };
}

// Hook for single symbol with WebSocket + REST fallback
export function useLivePrice(symbol: string): PriceData | null {
  const [price, setPrice] = useState<PriceData | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const wsFailedRef = useRef(false);

  const fetchPriceREST = useCallback(async () => {
    try {
      const response = await fetch(
        `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol.toUpperCase()}`
      );
      
      if (!response.ok) return;
      
      const data = await response.json();
      setPrice({
        symbol: data.symbol,
        price: parseFloat(data.lastPrice),
        change24h: parseFloat(data.priceChangePercent),
        lastUpdate: new Date(),
      });
    } catch (error) {
      console.error('REST API error for', symbol, error);
    }
  }, [symbol]);

  useEffect(() => {
    if (!symbol) return;

    // Clean up previous connections
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }
    wsFailedRef.current = false;

    // Try WebSocket first
    const ws = new WebSocket(
      `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@ticker`
    );
    wsRef.current = ws;

    const wsTimeout = setTimeout(() => {
      // If no message received within 5 seconds, switch to REST
      if (!wsFailedRef.current && ws.readyState !== WebSocket.OPEN) {
        console.log(`WebSocket timeout for ${symbol}, falling back to REST`);
        wsFailedRef.current = true;
        ws.close();
        fetchPriceREST();
        fallbackIntervalRef.current = setInterval(fetchPriceREST, 5000);
      }
    }, 5000);

    ws.onopen = () => {
      clearTimeout(wsTimeout);
    };

    ws.onmessage = (event) => {
      clearTimeout(wsTimeout);
      const data = JSON.parse(event.data);
      setPrice({
        symbol: data.s,
        price: parseFloat(data.c),
        change24h: parseFloat(data.P),
        lastUpdate: new Date(),
      });
    };

    ws.onerror = () => {
      if (!wsFailedRef.current) {
        console.log(`WebSocket error for ${symbol}, falling back to REST`);
        wsFailedRef.current = true;
        clearTimeout(wsTimeout);
        fetchPriceREST();
        fallbackIntervalRef.current = setInterval(fetchPriceREST, 5000);
      }
    };

    ws.onclose = () => {
      // Only log if it wasn't an intentional close and we haven't already fallen back
      if (!wsFailedRef.current) {
        wsFailedRef.current = true;
        clearTimeout(wsTimeout);
        fetchPriceREST();
        fallbackIntervalRef.current = setInterval(fetchPriceREST, 5000);
      }
    };

    return () => {
      clearTimeout(wsTimeout);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
      }
    };
  }, [symbol, fetchPriceREST]);

  return price;
}
