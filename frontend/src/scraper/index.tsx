import { Navigate, Route, Routes } from 'react-router-dom';
import { ScraperLayout } from './layout';
import { ScraperDashboardPage } from './pages/dashboard/page';
import { ScraperJobDetailPage } from './pages/job-detail/page';
import { ScraperJobsPage } from './pages/jobs/page';
import { ScraperLeadsPage } from './pages/leads/page';
import { ScraperCoreClawPage } from './pages/coreclaw/page';
import { ScraperSettingsPage } from './pages/settings/page';

export default function ScraperModule() {
  return (
    <Routes>
      <Route element={<ScraperLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<ScraperDashboardPage />} />
        <Route path="jobs" element={<ScraperJobsPage />} />
        <Route path="jobs/:jobId" element={<ScraperJobDetailPage />} />
        <Route path="leads" element={<ScraperLeadsPage />} />
        <Route path="coreclaw" element={<ScraperCoreClawPage />} />
        <Route path="settings" element={<ScraperSettingsPage />} />
      </Route>
    </Routes>
  );
}
