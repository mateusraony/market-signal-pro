import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertType, AlertTimeframe, TriggerMode, AlertParams } from '@/types/alerts';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

export function useAlerts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const alertsQuery = useQuery({
    queryKey: ['alerts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data.map(item => ({
        ...item,
        params: item.params as unknown as AlertParams,
      })) as Alert[];
    },
    enabled: !!user,
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
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('alerts')
        .insert({
          user_id: user.id,
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
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
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
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
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
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
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
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast.success(variables.paused ? 'Alerta pausado' : 'Alerta reativado');
    },
    onError: (error) => {
      toast.error('Erro: ' + error.message);
    },
  });

  const pauseAll = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('alerts')
        .update({ paused: true })
        .eq('user_id', user.id)
        .eq('active', true);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast.success('Todos os alertas pausados');
    },
    onError: (error) => {
      toast.error('Erro: ' + error.message);
    },
  });

  const resumeAll = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('alerts')
        .update({ paused: false })
        .eq('user_id', user.id)
        .eq('active', true);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
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
    pauseAll,
    resumeAll,
  };
}
