import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AlertsPage } from '@/components/alerts/AlertsPage';
import { HistoryPage } from '@/components/history/HistoryPage';
import { SettingsPage } from '@/components/settings/SettingsPage';
import { useAlerts } from '@/hooks/useAlerts';
import { useRealtimeAlerts } from '@/hooks/useRealtimeAlerts';

const Index = () => {
  const [currentPage, setCurrentPage] = useState<'alerts' | 'history' | 'settings'>('alerts');
  const { alerts, pauseAll, resumeAll } = useAlerts();
  
  // Subscribe to realtime alerts for popup notifications
  useRealtimeAlerts();
  
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
};

export default Index;
