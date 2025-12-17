import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';

const BRT_TIMEZONE = 'America/Sao_Paulo';

export function formatToBRT(date: string | Date): string {
  const zonedDate = toZonedTime(new Date(date), BRT_TIMEZONE);
  return format(zonedDate, "dd/MM/yyyy HH:mm", { locale: ptBR });
}

export function formatToBRTWithSeconds(date: string | Date): string {
  const zonedDate = toZonedTime(new Date(date), BRT_TIMEZONE);
  return format(zonedDate, "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
}

export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { 
    addSuffix: true, 
    locale: ptBR 
  });
}

export function formatPrice(price: number | null, decimals: number = 2): string {
  if (price === null || price === undefined) return '-';
  
  if (price >= 1) {
    return price.toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
  
  // For small numbers (< 1), show more decimals
  return price.toLocaleString('pt-BR', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 8,
  });
}

export function formatPercent(value: number | null): string {
  if (value === null || value === undefined) return '-';
  return `${value.toFixed(1)}%`;
}

export function formatRSI(value: number | null): string {
  if (value === null || value === undefined) return '-';
  return value.toFixed(2);
}

export function getRSIColor(value: number | null): string {
  if (value === null) return 'text-muted-foreground';
  if (value <= 30) return 'text-success';
  if (value >= 70) return 'text-destructive';
  return 'text-warning';
}

export function getDirectionColor(direction: string | null): string {
  if (!direction) return 'text-muted-foreground';
  if (direction === 'up') return 'text-success';
  if (direction === 'down') return 'text-destructive';
  return 'text-muted-foreground';
}

export function formatSymbol(symbol: string): string {
  // Remove common suffixes and format
  return symbol.toUpperCase();
}

export function formatExchange(exchange: string): string {
  return exchange.charAt(0).toUpperCase() + exchange.slice(1).toLowerCase();
}
