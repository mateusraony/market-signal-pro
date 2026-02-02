import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');

interface AlertMessage {
  chatId: string;
  symbol: string;
  type: 'price_level' | 'rsi_level' | 'macd_cross' | 'volume_spike';
  timeframe: string | null;
  price: number;
  rsi?: number;
  macd?: { line: number; signal: number; histogram: number };
  volumeRatio?: number;
  direction?: string;
  confidence?: string;
  probUp?: number;
  probDown?: number;
  retroactive?: boolean;
}

function formatAlertMessage(alert: AlertMessage): string {
  const emoji = getAlertEmoji(alert.type);
  const typeLabel = getTypeLabel(alert.type);
  const timeframeLabel = alert.timeframe ? ` (${alert.timeframe.toUpperCase()})` : '';
  
  let message = `${emoji} *ALERTA ${typeLabel}${timeframeLabel}*\n\n`;
  message += `📊 *${alert.symbol.toUpperCase()}*\n`;
  message += `💰 Preço: $${formatNumber(alert.price)}\n`;

  if (alert.type === 'rsi_level' && alert.rsi !== undefined) {
    const rsiEmoji = alert.rsi >= 70 ? '🔴' : alert.rsi <= 30 ? '🟢' : '🟡';
    message += `${rsiEmoji} RSI: ${alert.rsi.toFixed(2)}\n`;
  }

  if (alert.type === 'macd_cross' && alert.macd) {
    const crossEmoji = alert.macd.histogram > 0 ? '🟢' : '🔴';
    message += `${crossEmoji} MACD: ${formatNumber(alert.macd.line)}\n`;
    message += `📈 Signal: ${formatNumber(alert.macd.signal)}\n`;
    message += `📊 Histograma: ${formatNumber(alert.macd.histogram)}\n`;
  }

  if (alert.type === 'volume_spike' && alert.volumeRatio !== undefined) {
    message += `📈 Volume: ${alert.volumeRatio.toFixed(0)}% da média\n`;
  }

  // AI prediction section
  if (alert.direction || alert.probUp !== undefined) {
    message += `\n🤖 *Análise IA:*\n`;
    if (alert.direction) {
      const dirEmoji = alert.direction === 'up' ? '🟢' : '🔴';
      message += `${dirEmoji} Direção: ${alert.direction === 'up' ? 'ALTA' : 'BAIXA'}\n`;
    }
    if (alert.probUp !== undefined && alert.probDown !== undefined) {
      message += `📈 Prob. Alta: ${(alert.probUp * 100).toFixed(0)}%\n`;
      message += `📉 Prob. Baixa: ${(alert.probDown * 100).toFixed(0)}%\n`;
    }
    if (alert.confidence) {
      message += `🎯 Confiança: ${alert.confidence.toUpperCase()}\n`;
    }
  }

  if (alert.retroactive) {
    message += `\n⚠️ _Alerta retroativo (ocorreu durante downtime)_\n`;
  }

  message += `\n⏰ ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} BRT`;

  return message;
}

function getAlertEmoji(type: string): string {
  const map: Record<string, string> = {
    'price_level': '💵',
    'rsi_level': '📊',
    'macd_cross': '📈',
    'volume_spike': '🔊',
  };
  return map[type] || '🔔';
}

function getTypeLabel(type: string): string {
  const map: Record<string, string> = {
    'price_level': 'PREÇO',
    'rsi_level': 'RSI',
    'macd_cross': 'MACD',
    'volume_spike': 'VOLUME',
  };
  return map[type] || type.toUpperCase();
}

function formatNumber(num: number): string {
  if (Math.abs(num) < 0.0001) {
    return num.toExponential(4);
  }
  if (Math.abs(num) < 1) {
    return num.toFixed(6);
  }
  if (Math.abs(num) >= 1000) {
    return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
  return num.toFixed(2);
}

async function sendTelegramMessage(chatId: string, message: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN not configured');
    return false;
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });

    const result = await response.json();

    if (!result.ok) {
      console.error('Telegram API error:', result);
      return false;
    }

    console.log(`Message sent to ${chatId}`);
    return true;
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { chatId, alert, rawMessage } = body;

    if (!chatId) {
      return new Response(
        JSON.stringify({ error: 'chatId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let message: string;
    
    if (rawMessage) {
      message = rawMessage;
    } else if (alert) {
      message = formatAlertMessage({ chatId, ...alert });
    } else {
      return new Response(
        JSON.stringify({ error: 'Either alert or rawMessage is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const success = await sendTelegramMessage(chatId, message);

    return new Response(
      JSON.stringify({ success, message: success ? 'Message sent' : 'Failed to send message' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-telegram function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
