import { Layout } from '@/crm/layout/components/layout';
import { LayoutProvider } from '@/crm/layout/components/layout-context';
import { SCRAPER_NAV } from '../config';

export function ScraperLayout() {
  return (
    <LayoutProvider sidebarNavItems={SCRAPER_NAV}>
      <Layout />
    </LayoutProvider>
  );
}
