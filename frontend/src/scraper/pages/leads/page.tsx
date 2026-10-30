import { useEffect, useMemo, useState } from 'react';
import {
  ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  PaginationState,
  useReactTable,
} from '@tanstack/react-table';
import { Content } from '@/crm/layout/components/content';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { Input } from '@/components/ui/input';
import { fetchJobs, flattenLeads, type Lead } from '../../api';
import { ScraperPageHeader } from '../../components/page-header';

export function ScraperLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 15,
  });

  useEffect(() => {
    fetchJobs()
      .then((jobs) => setLeads(flattenLeads(jobs)))
      .catch(() => setLeads([]));
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return leads;
    return leads.filter((lead) =>
      [lead.name, lead.website, lead.email, lead.category, lead.location]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [leads, search]);

  const columns = useMemo<ColumnDef<Lead>[]>(
    () => [
      {
        accessorKey: 'name',
        id: 'name',
        header: ({ column }) => (
          <DataGridColumnHeader title="Lead" column={column} />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
        size: 200,
      },
      {
        accessorKey: 'source',
        id: 'source',
        header: ({ column }) => (
          <DataGridColumnHeader title="Source" column={column} />
        ),
        cell: ({ row }) => <Badge>{row.original.source}</Badge>,
        size: 120,
      },
      {
        accessorKey: 'website',
        id: 'website',
        header: ({ column }) => (
          <DataGridColumnHeader title="Website" column={column} />
        ),
        cell: ({ row }) =>
          row.original.website ? (
            <a
              href={row.original.website}
              target="_blank"
              rel="noreferrer"
              className="text-primary"
            >
              {row.original.website}
            </a>
          ) : (
            ''
          ),
        size: 200,
      },
      {
        accessorKey: 'email',
        id: 'email',
        header: ({ column }) => (
          <DataGridColumnHeader title="Email" column={column} />
        ),
        cell: ({ row }) => row.original.email,
        size: 200,
      },
      {
        accessorKey: 'verified',
        id: 'verified',
        header: ({ column }) => (
          <DataGridColumnHeader title="Verification" column={column} />
        ),
        cell: ({ row }) => (
          <Badge variant={row.original.verified ? 'default' : 'secondary'}>
            {row.original.verified ? 'Verified' : 'Raw'}
          </Badge>
        ),
        size: 120,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <>
      <ScraperPageHeader
        title="Leads"
        description="Leads collected by your jobs."
      />
      <div className="container-fluid">
        <Content className="block py-5">
          <Card>
            <CardHeader>
              <CardTitle>Leads</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search leads"
              />
              <DataGrid
                table={table}
                recordCount={filtered.length}
                emptyMessage="No leads yet. Create a job, and results will appear here when real adapters are built."
              >
                <DataGridTable />
                <DataGridPagination />
              </DataGrid>
              <p className="text-sm text-muted-foreground">
                Showing {filtered.length} of {leads.length} leads.
              </p>
            </CardContent>
          </Card>
        </Content>
      </div>
    </>
  );
}
