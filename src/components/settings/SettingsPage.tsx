import { useProfile } from '@/hooks/useProfile';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, MessageCircle, Clock, Loader2, Volume2, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';
import { SystemStatus } from './SystemStatus';
import { toast } from 'sonner';

export function SettingsPage() {
  const { profile, isLoading, updateProfile } = useProfile();
  const { playAlertSound, playSuccessSound, playWarningSound, playErrorSound } = useNotificationSound();
  
  const [telegramId, setTelegramId] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [quietStart, setQuietStart] = useState('');
  const [quietEnd, setQuietEnd] = useState('');

  useEffect(() => {
    if (profile) {
      setTelegramId(profile.telegram_id || '');
      setTelegramUsername(profile.telegram_username || '');
      setQuietStart(profile.quiet_hours_start || '');
      setQuietEnd(profile.quiet_hours_end || '');
    }
  }, [profile]);

  const handleSave = async () => {
    await updateProfile.mutateAsync({
      telegram_id: telegramId || null,
      telegram_username: telegramUsername || null,
      quiet_hours_start: quietStart || null,
      quiet_hours_end: quietEnd || null,
    });
  };

  const testTelegramNotification = async () => {
    if (!telegramId) {
      toast.error('Configure seu Telegram ID primeiro');
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-telegram`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            chatId: telegramId,
            rawMessage: '🔔 *Teste de Notificação*\n\nSeu sistema de alertas está configurado corretamente!\n\n✅ Você receberá alertas neste chat.',
          }),
        }
      );

      const result = await response.json();
      
      if (result.success) {
        toast.success('Notificação de teste enviada!');
        playSuccessSound();
      } else {
        toast.error('Falha ao enviar notificação');
        playErrorSound();
      }
    } catch (error) {
      toast.error('Erro ao enviar notificação');
      playErrorSound();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Settings className="w-6 h-6 text-primary" />
          Configurações
        </h1>
        <p className="text-muted-foreground mt-1">
          Gerencie suas preferências e integrações
        </p>
      </div>

      {/* System Status */}
      <SystemStatus />

      {/* Sound Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="w-5 h-5" />
            Sons de Notificação
          </CardTitle>
          <CardDescription>
            Teste os sons que serão reproduzidos quando alertas forem disparados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => { playAlertSound(); toast.info('Som de alerta'); }}
            >
              <Bell className="w-4 h-4 mr-2" />
              Alerta
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => { playSuccessSound(); toast.success('Sucesso!'); }}
              className="text-success border-success/30"
            >
              Sucesso
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => { playWarningSound(); toast.warning('Atenção!'); }}
              className="text-warning border-warning/30"
            >
              Aviso
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => { playErrorSound(); toast.error('Erro!'); }}
              className="text-destructive border-destructive/30"
            >
              Erro
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Telegram Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Integração Telegram
          </CardTitle>
          <CardDescription>
            Configure sua conta do Telegram para receber alertas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <h4 className="font-medium text-sm mb-2">Como configurar:</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Procure pelo bot <code className="bg-muted px-1 rounded">@SeuBotDeAlertas</code> no Telegram</li>
              <li>Envie o comando <code className="bg-muted px-1 rounded">/start</code></li>
              <li>O bot vai informar seu Telegram ID</li>
              <li>Cole o ID no campo abaixo e teste</li>
            </ol>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="telegram-id">Telegram ID</Label>
            <Input
              id="telegram-id"
              placeholder="Ex: 123456789"
              value={telegramId}
              onChange={(e) => setTelegramId(e.target.value)}
              className="font-mono"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="telegram-username">Username (opcional)</Label>
            <Input
              id="telegram-username"
              placeholder="@seu_username"
              value={telegramUsername}
              onChange={(e) => setTelegramUsername(e.target.value)}
            />
          </div>

          <Button 
            variant="outline" 
            className="w-full"
            onClick={testTelegramNotification}
            disabled={!telegramId}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Enviar Notificação de Teste
          </Button>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Horário de Silêncio
          </CardTitle>
          <CardDescription>
            Configure um período sem notificações (horário BRT)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quiet-start">Início</Label>
              <Input
                id="quiet-start"
                type="time"
                value={quietStart}
                onChange={(e) => setQuietStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quiet-end">Fim</Label>
              <Input
                id="quiet-end"
                type="time"
                value={quietEnd}
                onChange={(e) => setQuietEnd(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Durante este período, alertas serão registrados mas não enviados ao Telegram
          </p>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave}
          disabled={updateProfile.isPending}
          className="glow-primary"
        >
          {updateProfile.isPending ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </div>
  );
}
