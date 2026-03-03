import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/alerts';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export function useProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      
      if (!data) {
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({ user_id: user.id })
          .select()
          .single();
        
        if (insertError) throw insertError;
        return newProfile as Profile;
      }
      
      return data as Profile;
    },
    enabled: !!user,
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Perfil atualizado');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar perfil: ' + error.message);
    },
  });

  return {
    profile: profileQuery.data,
    isLoading: profileQuery.isLoading,
    error: profileQuery.error,
    updateProfile,
  };
}
