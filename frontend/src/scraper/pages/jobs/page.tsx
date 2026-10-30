import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
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
import { downloadCsv, fetchJobs, type Job } from '../../api';
import { NewJobSheet } from '../../components/new-job-sheet';
import { ScraperPageHeader } from '../../components/page-header';

export function ScraperJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);

  async function load() {
    try {
      setJobs(await fetchJobs());
    } catch {
      setError('Failed to load jobs.');
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <ScraperPageHeader
        title="Jobs"
        description="All scraping jobs, newest first."
        actions={
          <Button size="sm" onClick={() => setSheetOpen(true)}>
            <Plus /> New Job
          </Button>
        }
      />
      <div className="container-fluid">
        <Content className="block py-5">
          <Card>
            <CardHeader>
              <CardTitle>Job queue</CardTitle>
            </CardHeader>
            <CardContent>
              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : jobs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No jobs yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead>Query</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Results</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell>{job.source}</TableCell>
                        <TableCell>{job.query}</TableCell>
                        <TableCell>{job.location}</TableCell>
                        <TableCell>
                          <Badge>{job.status}</Badge>
                        </TableCell>
                        <TableCell>{job.results.length}</TableCell>
                        <TableCell className="flex gap-2">
                          <Link to={`/scraper/jobs/${job.id}`}>
                            <Button variant="outline" size="sm">
                              View
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              downloadCsv(
                                `job-${job.id}.csv`,
                                job.results || [],
                              )
                            }
                          >
                            CSV
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </Content>
      </div>
      <NewJobSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onCreated={() => load()}
      />
    </>
  );
}
