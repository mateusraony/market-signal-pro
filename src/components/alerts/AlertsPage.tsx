import { useAlerts } from '@/hooks/useAlerts';
import { Alert } from '@/types/alerts';
import { AlertCard } from './AlertCard';
import { CreateAlertDialog } from './CreateAlertDialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Bell, Search, Filter, Plus, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export function AlertsPage() {
  const { alerts, isLoading, togglePause, deleteAlert } = useAlerts();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredAlerts = alerts.filter((alert) => {
    const matchesSearch = alert.symbol.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || alert.type === filterType;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && !alert.paused && alert.active) ||
      (filterStatus === 'paused' && alert.paused);
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este alerta?')) {
      deleteAlert.mutate(id);
    }
  };

  const handleEdit = (alert: Alert) => {
    toast.info('Edição em desenvolvimento');
  };

  // Stats
  const activeCount = alerts.filter(a => a.active && !a.paused).length;
  const pausedCount = alerts.filter(a => a.paused).length;
  const totalCount = alerts.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Bell className="w-6 h-6 text-primary" />
            Alertas
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie seus alertas de preço, RSI e MACD
          </p>
        </div>
        <CreateAlertDialog />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-card border border-border">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold font-mono">{totalCount}</p>
        </div>
        <div className="p-4 rounded-xl bg-success/10 border border-success/20">
          <p className="text-sm text-success">Ativos</p>
          <p className="text-2xl font-bold font-mono text-success">{activeCount}</p>
        </div>
        <div className="p-4 rounded-xl bg-warning/10 border border-warning/20">
          <p className="text-sm text-warning">Pausados</p>
          <p className="text-2xl font-bold font-mono text-warning">{pausedCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por símbolo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="price_level">Preço</SelectItem>
            <SelectItem value="rsi_level">RSI</SelectItem>
            <SelectItem value="macd_cross">MACD</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="paused">Pausados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Alerts Grid */}
      {filteredAlerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 rounded-xl border border-dashed border-border bg-card/50">
          <Bell className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">
            {alerts.length === 0 ? 'Nenhum alerta criado' : 'Nenhum resultado'}
          </h3>
          <p className="text-muted-foreground text-center mb-6 max-w-sm">
            {alerts.length === 0 
              ? 'Crie seu primeiro alerta para começar a monitorar o mercado'
              : 'Tente ajustar os filtros de busca'}
          </p>
          {alerts.length === 0 && (
            <CreateAlertDialog 
              trigger={
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Alerta
                </Button>
              }
            />
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onTogglePause={(id, paused) => togglePause.mutate({ id, paused })}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}
