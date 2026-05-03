import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Activity,
  Bell,
  History,
  Settings,
  PauseCircle,
  PlayCircle,
  BarChart3,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  isPanicMode = false,
}: DashboardLayoutProps) {
  const { user, signOut } = useAuth();

  const navItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: BarChart3 },
    { id: 'alerts' as const, label: 'Alertas', icon: Bell },
    { id: 'history' as const, label: 'Histórico', icon: History },
    { id: 'settings' as const, label: 'Config', icon: Settings },
  ];

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Aurora animated background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="aurora-blob aurora-blob-1" />
        <div className="aurora-blob aurora-blob-2" />
        <div className="aurora-blob aurora-blob-3" />
        <div className="absolute inset-0 bg-grid-overlay opacity-[0.04]" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/40 to-background/90" />
      </div>

      {/* Top navigation */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/40 border-b border-border/40">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3 animate-fade-in">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-primary/30 to-primary/5 border border-primary/30 flex items-center justify-center shadow-[0_0_20px_hsl(var(--primary)/0.25)]">
              <Activity className="w-4 h-4 text-primary" />
              <span className="absolute inset-0 rounded-xl border border-primary/40 animate-ping opacity-20" />
            </div>
            <div className="leading-tight">
              <h1 className="font-semibold text-base tracking-tight">
                Alert<span className="text-gradient-primary">Station</span>
              </h1>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Market intelligence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'hidden sm:inline-flex gap-2 rounded-full border-border/60 bg-background/40 backdrop-blur transition-all hover:border-primary/50 hover:shadow-[0_0_15px_hsl(var(--primary)/0.2)]',
                isPanicMode && 'border-destructive/60 text-destructive hover:border-destructive'
              )}
              onClick={isPanicMode ? onResumeAll : onPauseAll}
            >
              {isPanicMode ? (
                <>
                  <PlayCircle className="w-4 h-4" /> Reativar
                </>
              ) : (
                <>
                  <PauseCircle className="w-4 h-4" /> Pausar todos
                </>
              )}
            </Button>

            {user && (
              <span className="hidden md:inline text-xs text-muted-foreground max-w-[180px] truncate">
                {user.email}
              </span>
            )}

            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={signOut}
                    className="rounded-full hover:bg-destructive/10 hover:text-destructive"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Sair</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-32 animate-fade-in">
        {children}
      </main>

      {/* Bottom dock */}
      <nav
        aria-label="Navegação principal"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-2"
      >
        <div className="relative flex items-end gap-1 px-2 py-2 rounded-2xl border border-border/60 bg-background/60 backdrop-blur-2xl shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.35)]">
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-primary/20 via-transparent to-primary/20 opacity-50 -z-10 blur-md" />
          {navItems.map((item) => {
            const active = currentPage === item.id;
            return (
              <TooltipProvider key={item.id} delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onPageChange(item.id)}
                      className={cn(
                        'group relative flex flex-col items-center justify-center gap-0.5 rounded-xl px-3 sm:px-4 py-2 transition-all duration-300',
                        'hover:-translate-y-0.5',
                        active
                          ? 'text-primary'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {active && (
                        <span className="absolute inset-0 rounded-xl bg-primary/10 border border-primary/30 shadow-[0_0_20px_hsl(var(--primary)/0.35)] animate-fade-in" />
                      )}
                      <item.icon className="relative w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                      <span className="relative text-[10px] font-medium tracking-wide">
                        {item.label}
                      </span>
                      {active && (
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">{item.label}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}

          {/* Mobile pause toggle inside dock */}
          <div className="sm:hidden border-l border-border/60 ml-1 pl-1">
            <button
              onClick={isPanicMode ? onResumeAll : onPauseAll}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-2 transition-colors',
                isPanicMode
                  ? 'text-destructive'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {isPanicMode ? (
                <PlayCircle className="w-5 h-5" />
              ) : (
                <PauseCircle className="w-5 h-5" />
              )}
              <span className="text-[10px] font-medium">
                {isPanicMode ? 'Reativar' : 'Pausar'}
              </span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}
