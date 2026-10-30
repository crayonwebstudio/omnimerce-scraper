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
import { Progress } from '@/components/ui/progress';
import { ProgressCircle } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { fetchJobs, flattenLeads, type Job } from '../../api';
import { NewJobSheet } from '../../components/new-job-sheet';
import { ScraperPageHeader } from '../../components/page-header';

export function ScraperDashboardPage() {
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

  const leads = flattenLeads(jobs);
  const verified = leads.filter((lead) => lead.verified).length;
  const completed = jobs.filter((job) => job.status === 'stub_complete').length;
  const progress =
    jobs.length > 0 ? Math.round((completed / jobs.length) * 100) : 0;
  const topSource =
    jobs.length > 0
      ? Object.entries(
          jobs.reduce<Record<string, number>>((acc, job) => {
            acc[job.source] = (acc[job.source] || 0) + 1;
            return acc;
          }, {}),
        ).sort((a, b) => b[1] - a[1])[0][0]
      : 'No jobs yet';

  return (
    <>
      <ScraperPageHeader
        title="Omnimerce Scraper"
        description="Jobs, leads, and cost overview."
        actions={
          <Button size="sm" onClick={() => setSheetOpen(true)}>
            <Plus /> New Job
          </Button>
        }
      />
      <div className="container-fluid">
        <Content className="block space-y-6 py-5">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Jobs run</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{jobs.length}</p>
                <p className="text-sm text-muted-foreground">
                  Top source: {topSource}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Leads kept</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{leads.length}</p>
                <p className="text-sm text-muted-foreground">
                  Verified: {verified}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>MB used</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">Not measured yet</p>
                <p className="text-sm text-muted-foreground">
                  Measurement starts with real adapters.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">Not measured yet</p>
                <p className="text-sm text-muted-foreground">
                  Proxy cost starts with real adapters.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Job performance</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-5">
                <ProgressCircle value={progress} size={60} strokeWidth={6}>
                  <span className="text-base font-medium">{progress}%</span>
                </ProgressCircle>
                <div className="space-y-1 text-sm">
                  <p>
                    Completed: {completed} of {jobs.length} jobs
                  </p>
                  <p>Leads kept: {leads.length}</p>
                  <Progress value={progress} />
                </div>
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Recent jobs</CardTitle>
              </CardHeader>
              <CardContent>
                {jobs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No jobs yet. Create a job to see it here.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Source</TableHead>
                        <TableHead>Query</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Results</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobs.slice(0, 5).map((job) => (
                        <TableRow key={job.id}>
                          <TableCell>{job.source}</TableCell>
                          <TableCell>{job.query}</TableCell>
                          <TableCell>
                            <Badge>{job.status}</Badge>
                          </TableCell>
                          <TableCell>{job.results.length}</TableCell>
                          <TableCell>
                            <Link to={`/scraper/jobs/${job.id}`}>
                              <Button variant="outline" size="sm">
                                View
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>LinkedIn guardrail</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Public research only, no automated LinkedIn scraping, no
                guessed links or emails.
              </p>
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
