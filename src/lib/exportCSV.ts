import { AlertHistory, formatAlertType, formatTimeframe } from '@/types/alerts';
import { format } from 'date-fns';

export function exportHistoryToCSV(history: AlertHistory[], filename?: string): void {
  if (history.length === 0) {
    console.warn('No data to export');
    return;
  }

  const headers = [
    'ID',
    'Símbolo',
    'Exchange',
    'Tipo',
    'Timeframe',
    'Data/Hora (UTC)',
    'Preço',
    'RSI',
    'MACD Line',
    'MACD Signal',
    'MACD Hist',
    'Direção',
    'Prob Up (%)',
    'Prob Down (%)',
    'Confiança',
    'Retroativo',
    'Comentário AI',
  ];

  const rows = history.map((item) => [
    item.id,
    item.symbol,
    item.exchange,
    formatAlertType(item.type),
    formatTimeframe(item.timeframe),
    format(new Date(item.event_time_utc), 'yyyy-MM-dd HH:mm:ss'),
    item.price_at_event?.toFixed(2) ?? '',
    item.rsi_at_event?.toFixed(2) ?? '',
    item.macd_line_at_event?.toFixed(6) ?? '',
    item.macd_signal_at_event?.toFixed(6) ?? '',
    item.macd_hist_at_event?.toFixed(6) ?? '',
    item.direction_guess ?? '',
    item.prob_up ? (item.prob_up * 100).toFixed(1) : '',
    item.prob_down ? (item.prob_down * 100).toFixed(1) : '',
    item.confidence_level ?? '',
    item.retroactive ? 'Sim' : 'Não',
    item.comment_ai ?? '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => {
        // Escape quotes and wrap in quotes if contains comma or newline
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    ),
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `alertstation-history-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
