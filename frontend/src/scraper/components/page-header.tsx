import type { ReactNode } from 'react';
import { ContentHeader } from '@/crm/layout/components/content-header';

export function ScraperPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <ContentHeader>
      <div>
        <h1 className="text-sm font-semibold">{title}</h1>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {actions ? (
        <div className="flex items-center gap-2.5">{actions}</div>
      ) : null}
    </ContentHeader>
  );
}
