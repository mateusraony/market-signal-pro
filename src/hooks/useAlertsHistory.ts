import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AlertHistory, AlertType, AlertTimeframe } from '@/types/alerts';

interface HistoryFilters {
  symbol?: string;
  type?: AlertType;
  timeframe?: AlertTimeframe;
  startDate?: Date;
  endDate?: Date;
  retroactive?: boolean;
}

export function useAlertsHistory(filters?: HistoryFilters, refetchIntervalMs?: number | false) {
  return useQuery({
    queryKey: ['alerts-history', filters],
    refetchInterval: refetchIntervalMs ?? false,
    refetchIntervalInBackground: false,
    queryFn: async () => {
      let query = supabase
        .from('alerts_history')
        .select('*')
        .order('event_time_utc', { ascending: false });
      
      if (filters?.symbol) {
        query = query.ilike('symbol', `%${filters.symbol}%`);
      }
      
      if (filters?.type) {
        query = query.eq('type', filters.type);
      }
      
      if (filters?.timeframe) {
        query = query.eq('timeframe', filters.timeframe);
      }
      
      if (filters?.startDate) {
        query = query.gte('event_time_utc', filters.startDate.toISOString());
      }
      
      if (filters?.endDate) {
        query = query.lte('event_time_utc', filters.endDate.toISOString());
      }
      
      if (filters?.retroactive !== undefined) {
        query = query.eq('retroactive', filters.retroactive);
      }
      
      const { data, error } = await query.limit(100);
      
      if (error) throw error;
      
      return data.map(item => ({
        ...item,
        price_at_event: item.price_at_event != null ? Number(item.price_at_event) : null,
        rsi_at_event: item.rsi_at_event != null ? Number(item.rsi_at_event) : null,
        macd_line_at_event: item.macd_line_at_event != null ? Number(item.macd_line_at_event) : null,
        macd_signal_at_event: item.macd_signal_at_event != null ? Number(item.macd_signal_at_event) : null,
        macd_hist_at_event: item.macd_hist_at_event != null ? Number(item.macd_hist_at_event) : null,
        prob_up: item.prob_up != null ? Number(item.prob_up) : null,
        prob_down: item.prob_down != null ? Number(item.prob_down) : null,
      })) as AlertHistory[];
    },
  });
}
