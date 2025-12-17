export type AlertType = 'price_level' | 'rsi_level' | 'macd_cross';
export type AlertTimeframe = '4h' | '1d' | '1w' | '1m';
export type TriggerMode = 'once' | 'every_touch' | 'crossing' | 'touch';
export type PriceDirection = 'above' | 'below' | 'cross';

export interface AlertParams {
  // Price alert params
  target_price?: number;
  price_direction?: PriceDirection;
  
  // RSI params
  rsi_level?: number;
  rsi_mode?: 'crossing' | 'touch';
  
  // MACD params
  macd_mode?: 'signal_cross' | 'zero_cross';
}

export interface Alert {
  id: string;
  user_id: string;
  symbol: string;
  exchange: string;
  type: AlertType;
  timeframe: AlertTimeframe | null;
  params: AlertParams;
  mode: TriggerMode;
  active: boolean;
  paused: boolean;
  last_trigger_candle_open_time: string | null;
  cooldown_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface AlertHistory {
  id: string;
  alert_id: string | null;
  user_id: string;
  symbol: string;
  exchange: string;
  type: AlertType;
  timeframe: AlertTimeframe | null;
  event_time_utc: string;
  detected_time_utc: string;
  retroactive: boolean;
  price_at_event: number | null;
  rsi_at_event: number | null;
  macd_line_at_event: number | null;
  macd_signal_at_event: number | null;
  macd_hist_at_event: number | null;
  direction_guess: string | null;
  prob_up: number | null;
  prob_down: number | null;
  confidence_level: string | null;
  comment_ai: string | null;
  model_version: string;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  telegram_id: string | null;
  telegram_username: string | null;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  timezone: string;
  created_at: string;
  updated_at: string;
}

// Utility functions
export function formatTimeframe(tf: AlertTimeframe | null): string {
  if (!tf) return '-';
  const map: Record<AlertTimeframe, string> = {
    '4h': '4 Horas',
    '1d': '1 Dia',
    '1w': '1 Semana',
    '1m': '1 Mês',
  };
  return map[tf];
}

export function formatAlertType(type: AlertType): string {
  const map: Record<AlertType, string> = {
    'price_level': 'Preço',
    'rsi_level': 'RSI',
    'macd_cross': 'MACD',
  };
  return map[type];
}

export function getAlertTypeColor(type: AlertType): string {
  const map: Record<AlertType, string> = {
    'price_level': 'text-primary',
    'rsi_level': 'text-warning',
    'macd_cross': 'text-success',
  };
  return map[type];
}
