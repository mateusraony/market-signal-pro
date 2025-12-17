-- Enum para tipos de alerta
CREATE TYPE alert_type AS ENUM ('price_level', 'rsi_level', 'macd_cross');

-- Enum para timeframes
CREATE TYPE alert_timeframe AS ENUM ('4h', '1d', '1w', '1m');

-- Enum para modo de disparo
CREATE TYPE trigger_mode AS ENUM ('once', 'every_touch', 'crossing', 'touch');

-- Enum para direção de preço
CREATE TYPE price_direction AS ENUM ('above', 'below', 'cross');

-- Tabela de perfis de usuário
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_id TEXT,
  telegram_username TEXT,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de alertas
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  exchange TEXT NOT NULL DEFAULT 'binance',
  type alert_type NOT NULL,
  timeframe alert_timeframe,
  params JSONB NOT NULL DEFAULT '{}',
  mode trigger_mode NOT NULL DEFAULT 'once',
  active BOOLEAN NOT NULL DEFAULT true,
  paused BOOLEAN NOT NULL DEFAULT false,
  last_trigger_candle_open_time TIMESTAMPTZ,
  cooldown_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de histórico de alertas
CREATE TABLE public.alerts_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID REFERENCES public.alerts(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  exchange TEXT NOT NULL,
  type alert_type NOT NULL,
  timeframe alert_timeframe,
  event_time_utc TIMESTAMPTZ NOT NULL,
  detected_time_utc TIMESTAMPTZ NOT NULL DEFAULT now(),
  retroactive BOOLEAN NOT NULL DEFAULT false,
  price_at_event DECIMAL(20, 8),
  rsi_at_event DECIMAL(10, 4),
  macd_line_at_event DECIMAL(20, 8),
  macd_signal_at_event DECIMAL(20, 8),
  macd_hist_at_event DECIMAL(20, 8),
  direction_guess TEXT,
  prob_up DECIMAL(5, 2),
  prob_down DECIMAL(5, 2),
  confidence_level TEXT,
  comment_ai TEXT,
  model_version TEXT DEFAULT 'v1.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de eventos do sistema (downtime, etc)
CREATE TABLE public.system_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  start_time_utc TIMESTAMPTZ NOT NULL,
  end_time_utc TIMESTAMPTZ,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_alerts_user_id ON public.alerts(user_id);
CREATE INDEX idx_alerts_symbol ON public.alerts(symbol);
CREATE INDEX idx_alerts_active ON public.alerts(active);
CREATE INDEX idx_alerts_history_user_id ON public.alerts_history(user_id);
CREATE INDEX idx_alerts_history_alert_id ON public.alerts_history(alert_id);
CREATE INDEX idx_alerts_history_event_time ON public.alerts_history(event_time_utc);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Políticas RLS para alerts
CREATE POLICY "Users can view own alerts"
  ON public.alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own alerts"
  ON public.alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
  ON public.alerts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own alerts"
  ON public.alerts FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas RLS para alerts_history
CREATE POLICY "Users can view own history"
  ON public.alerts_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own history"
  ON public.alerts_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- system_events é só leitura para usuários autenticados
CREATE POLICY "Authenticated users can view system events"
  ON public.system_events FOR SELECT
  TO authenticated
  USING (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at
  BEFORE UPDATE ON public.alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();