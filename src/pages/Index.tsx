import { useState } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { AuthPage } from '@/components/auth/AuthPage';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AlertsPage } from '@/components/alerts/AlertsPage';
import { HistoryPage } from '@/components/history/HistoryPage';
import { SettingsPage } from '@/components/settings/SettingsPage';
import { useAlerts } from '@/hooks/useAlerts';
import { Loader2 } from 'lucide-react';

function DashboardContent() {
  const [currentPage, setCurrentPage] = useState<'alerts' | 'history' | 'settings'>('alerts');
  const { alerts, pauseAll, resumeAll } = useAlerts();
  
  const isPanicMode = alerts.length > 0 && alerts.every(a => a.paused);

  return (
    <DashboardLayout 
      currentPage={currentPage} 
      onPageChange={setCurrentPage}
      onPauseAll={() => pauseAll.mutate()}
      onResumeAll={() => resumeAll.mutate()}
      isPanicMode={isPanicMode}
    >
      {currentPage === 'alerts' && <AlertsPage />}
      {currentPage === 'history' && <HistoryPage />}
      {currentPage === 'settings' && <SettingsPage />}
    </DashboardLayout>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return <DashboardContent />;
}

const Index = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default Index;
