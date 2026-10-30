import { Database, Home, ListChecks, Settings, Users } from 'lucide-react';
import type { NavConfig } from '@/crm/config/types';

export const SCRAPER_NAV: NavConfig = [
  {
    title: 'Dashboard',
    icon: Home,
    path: '/scraper/dashboard',
    id: 'dashboard',
    pinnable: true,
    pinned: true,
  },
  {
    title: 'Jobs',
    icon: ListChecks,
    path: '/scraper/jobs',
    id: 'jobs',
    pinnable: true,
    pinned: true,
  },
  {
    title: 'Leads',
    icon: Users,
    path: '/scraper/leads',
    id: 'leads',
    pinnable: true,
    pinned: true,
  },
  {
    title: 'CoreClaw',
    icon: Database,
    path: '/scraper/coreclaw',
    id: 'coreclaw',
    pinnable: true,
    pinned: true,
  },
  {
    title: 'Settings',
    icon: Settings,
    path: '/scraper/settings',
    id: 'settings',
    pinnable: true,
    pinned: true,
  },
];
