import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatAlertType, formatTimeframe } from '@/types/alerts';
import { useNotificationSound } from './useNotificationSound';
import { formatProbability } from '@/lib/format';

export function useRealtimeAlerts() {
  const queryClient = useQueryClient();
  const { playAlertSound } = useNotificationSound();

  useEffect(() => {
    const channel = supabase
      .channel('alerts-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts_history',
        },
        (payload) => {
          const newAlert = payload.new as any;
          
          // Play notification sound
          playAlertSound();
          
          // Show popup notification
          const direction = newAlert.direction_guess === 'up' ? '📈 ALTA' : 
                           newAlert.direction_guess === 'down' ? '📉 BAIXA' : '➡️ NEUTRO';
          
          toast.info(
            `🔔 ${newAlert.symbol} - ${formatAlertType(newAlert.type)}`,
            {
              description: `${direction} | ${newAlert.timeframe ? formatTimeframe(newAlert.timeframe) : 'Preço'} | Prob: ${formatProbability(newAlert.prob_up)}↑`,
              duration: 10000,
              action: {
                label: 'Ver',
                onClick: () => {
                  window.open(
                    `https://www.tradingview.com/chart/?symbol=${newAlert.exchange.toUpperCase()}:${newAlert.symbol}`,
                    '_blank'
                  );
                },
              },
            }
          );
          
          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['alerts-history'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, playAlertSound]);
}
