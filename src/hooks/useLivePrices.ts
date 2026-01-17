import { useState, useEffect, useCallback } from 'react';

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

// Hook for single symbol with WebSocket
export function useLivePrice(symbol: string): PriceData | null {
  const [price, setPrice] = useState<PriceData | null>(null);

  useEffect(() => {
    if (!symbol) return;

    const ws = new WebSocket(
      `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@ticker`
    );

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setPrice({
        symbol: data.s,
        price: parseFloat(data.c),
        change24h: parseFloat(data.P),
        lastUpdate: new Date(),
      });
    };

    ws.onerror = () => {
      console.error('WebSocket error for', symbol);
    };

    return () => {
      ws.close();
    };
  }, [symbol]);

  return price;
}
