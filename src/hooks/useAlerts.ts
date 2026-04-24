import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertType, AlertTimeframe, TriggerMode, AlertParams } from '@/types/alerts';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';

const PUBLIC_USER_ID = '00000000-0000-0000-0000-000000000000';

function getOwnerId(userId?: string) {
  return userId ?? PUBLIC_USER_ID;
}

export function useAlerts() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const ownerId = getOwnerId(user?.id);

  const alertsQuery = useQuery({
    queryKey: ['alerts', ownerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('user_id', ownerId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data.map(item => ({
        ...item,
        params: item.params as unknown as AlertParams,
      })) as Alert[];
    },
  });

  const createAlert = useMutation({
    mutationFn: async (alert: {
      symbol: string;
      exchange: string;
      type: AlertType;
      timeframe?: AlertTimeframe | null;
      params: AlertParams;
      mode: TriggerMode;
    }) => {
      const { data, error } = await supabase
        .from('alerts')
        .insert({
          user_id: ownerId,
          symbol: alert.symbol.toUpperCase(),
          exchange: alert.exchange.toLowerCase(),
          type: alert.type,
          timeframe: alert.timeframe ?? null,
          params: alert.params as unknown as Json,
          mode: alert.mode,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts', ownerId] });
      toast.success('Alerta criado com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao criar alerta: ' + error.message);
    },
  });

  const updateAlert = useMutation({
    mutationFn: async ({ id, params, ...updates }: Partial<Alert> & { id: string }) => {
      const updateData: Record<string, unknown> = { ...updates };
      if (params) {
        updateData.params = params as unknown as Json;
      }
      
      const { data, error } = await supabase
        .from('alerts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts', ownerId] });
      toast.success('Alerta atualizado');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar alerta: ' + error.message);
    },
  });

  const deleteAlert = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('alerts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts', ownerId] });
      toast.success('Alerta excluído');
    },
    onError: (error) => {
      toast.error('Erro ao excluir alerta: ' + error.message);
    },
  });

  const togglePause = useMutation({
    mutationFn: async ({ id, paused }: { id: string; paused: boolean }) => {
      const { error } = await supabase
        .from('alerts')
        .update({ paused })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['alerts', ownerId] });
      toast.success(variables.paused ? 'Alerta pausado' : 'Alerta reativado');
    },
    onError: (error) => {
      toast.error('Erro: ' + error.message);
    },
  });

  const reactivateAlert = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('alerts')
        .update({ active: true, paused: false, cooldown_until: null, last_trigger_candle_open_time: null })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts', ownerId] });
      toast.success('Alerta reativado com sucesso');
    },
    onError: (error) => {
      toast.error('Erro: ' + error.message);
    },
  });

  const pauseAll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('alerts')
        .update({ paused: true })
        .eq('active', true);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts', ownerId] });
      toast.success('Todos os alertas pausados');
    },
    onError: (error) => {
      toast.error('Erro: ' + error.message);
    },
  });

  const resumeAll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('alerts')
        .update({ paused: false })
        .eq('active', true);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts', ownerId] });
      toast.success('Todos os alertas reativados');
    },
    onError: (error) => {
      toast.error('Erro: ' + error.message);
    },
  });

  return {
    alerts: alertsQuery.data ?? [],
    isLoading: alertsQuery.isLoading,
    error: alertsQuery.error,
    createAlert,
    updateAlert,
    deleteAlert,
    togglePause,
    reactivateAlert,
    pauseAll,
    resumeAll,
  };
}
