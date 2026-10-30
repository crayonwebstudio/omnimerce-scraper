import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Content } from '@/crm/layout/components/content';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { downloadCsv, fetchJob, type Job } from '../../api';
import { ScraperPageHeader } from '../../components/page-header';

export function ScraperJobDetailPage() {
  const { jobId } = useParams();
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!jobId) return;
    fetchJob(jobId)
      .then(setJob)
      .catch(() => setError('Job not found.'));
  }, [jobId]);

  return (
    <>
      <ScraperPageHeader
        title="Job detail"
        description="Leads for this job."
        actions={
          job ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => downloadCsv(`job-${job.id}.csv`, job.results)}
            >
              Export CSV
            </Button>
          ) : undefined
        }
      />
      <div className="container-fluid">
        <Content className="block py-5">
          <Card>
            <CardHeader>
              <CardTitle>
                {job ? `${job.source}: ${job.query}` : 'Job'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : !job ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : job.results.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No leads yet for this job. Adapters are still stubs, so
                  results are empty until a real adapter runs.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Verification</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Website</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Source URL</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {job.results.map((lead, index) => (
                      <TableRow key={`${lead.job_id}-${index}`}>
                        <TableCell>
                          <Badge
                            variant={
                              lead.verified ? 'default' : 'secondary'
                            }
                          >
                            {lead.verified ? 'Verified' : 'Raw'}
                          </Badge>
                        </TableCell>
                        <TableCell>{lead.name}</TableCell>
                        <TableCell>{lead.website}</TableCell>
                        <TableCell>{lead.email}</TableCell>
                        <TableCell>{lead.source_url}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </Content>
      </div>
    </>
  );
}
