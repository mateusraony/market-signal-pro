import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Bell, 
  History, 
  Settings, 
  PauseCircle,
  PlayCircle,
  Menu,
  BarChart3
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
  currentPage: 'dashboard' | 'alerts' | 'history' | 'settings';
  onPageChange: (page: 'dashboard' | 'alerts' | 'history' | 'settings') => void;
  onPauseAll?: () => void;
  onResumeAll?: () => void;
  isPanicMode?: boolean;
}

export function DashboardLayout({ 
  children, 
  currentPage, 
  onPageChange,
  onPauseAll,
  onResumeAll,
  isPanicMode = false
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: BarChart3 },
    { id: 'alerts' as const, label: 'Alertas', icon: Bell },
    { id: 'history' as const, label: 'Histórico', icon: History },
    { id: 'settings' as const, label: 'Configurações', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-300 lg:translate-x-0 lg:static",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-sidebar-foreground font-mono">AlertStation</h1>
                <p className="text-xs text-muted-foreground">Sistema de Alertas</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onPageChange(item.id);
                  setSidebarOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                  currentPage === item.id
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Kill Switch */}
          <div className="p-4 border-t border-sidebar-border space-y-2">
            <p className="text-xs text-muted-foreground px-2 mb-2">Kill Switch</p>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "w-full justify-start gap-2",
                isPanicMode && "border-destructive text-destructive"
              )}
              onClick={isPanicMode ? onResumeAll : onPauseAll}
            >
              {isPanicMode ? (
                <>
                  <PlayCircle className="w-4 h-4" />
                  Reativar Todos
                </>
              ) : (
                <>
                  <PauseCircle className="w-4 h-4" />
                  Pausar Todos
                </>
              )}
            </Button>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-sidebar-border">
            <p className="text-xs text-muted-foreground text-center">
              Horários em BRT (UTC-3)
            </p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-card/50">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-muted"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <span className="font-bold font-mono">AlertStation</span>
          </div>
          <div className="w-9" /> {/* Spacer */}
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-auto p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
