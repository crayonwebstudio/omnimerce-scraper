import { useEffect, useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  createCoreClawJob,
  fetchCoreClawJob,
  fetchCoreClawJobs,
  fetchCoreClawStatus,
  type CoreClawStatus,
  type Job,
} from '../../api';
import { ScraperPageHeader } from '../../components/page-header';

export function ScraperCoreClawPage() {
  const [status, setStatus] = useState<CoreClawStatus | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [worker, setWorker] = useState('coreclaw~google-maps-scraper');
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [limit, setLimit] = useState('100');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setStatus(await fetchCoreClawStatus());
    } catch {
      setError('Failed to load CoreClaw status.');
    }
    try {
      setJobs(await fetchCoreClawJobs());
    } catch {
      setError('Failed to load CoreClaw jobs.');
    }
  }

  useEffect(() => {
    load();
    const timer = setInterval(async () => {
      try {
        const current = await fetchCoreClawJobs();
        const running = current.filter((job) => job.status === 'running');
        for (const job of running) {
          await fetchCoreClawJob(job.id);
        }
        setJobs(await fetchCoreClawJobs());
      } catch {
        // Keep the last shown jobs; polling retries on the next tick.
      }
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  async function submit() {
    setError('');
    if (!query.trim()) {
      setError('Query is required.');
      return;
    }
    setBusy(true);
    try {
      await createCoreClawJob({
        worker,
        query: query.trim(),
        location: location.trim(),
        limit: Math.min(1000, Math.max(1, parseInt(limit || '100', 10))),
      });
      setQuery('');
      setLocation('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create job.');
    } finally {
      setBusy(false);
    }
  }

  const selected = status?.workers.find((item) => item.id === worker);
  const queryLabel =
    worker === 'coreclaw~instagram-profile-scraper' ||
    worker === 'coreclaw~youtube-channel-scraper'
      ? 'URLs, one per line'
      : 'Query';

  return (
    <>
      <ScraperPageHeader
        title="CoreClaw"
        description="Run CoreClaw workers and collect the results as leads."
      />
      <div className="container-fluid">
        <Content className="block space-y-6 py-5">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Card>
            <CardHeader>
              <CardTitle>Connection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>
                <Badge>
                  {status
                    ? status.coreclaw_configured
                      ? 'Connected'
                      : 'Not connected'
                    : 'Loading'}
                </Badge>
              </p>
              {!status?.coreclaw_configured ? (
                <p className="text-sm text-muted-foreground">
                  Save your CoreClaw Personal API token in Settings, no
                  redeploy needed, before running a job. For a persistent
                  token, set CORECLAW_TOKEN in Coolify for app
                  omnimerce-scraper, then redeploy.
                </p>
              ) : null}
              {status?.coreclaw_configured && status.source ? (
                <p className="text-sm text-muted-foreground">
                  Connected via{' '}
                  {status.source === 'env' ? 'Coolify env' : 'Settings'}.
                </p>
              ) : null}
              <p className="text-sm text-muted-foreground">
                LinkedIn guardrail: public research only, no bulk personal
                profile scraping by default.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>New CoreClaw Job</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Worker</Label>
                <Select value={worker} onValueChange={setWorker}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select worker" />
                  </SelectTrigger>
                  <SelectContent>
                    {(status?.workers || []).map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selected ? (
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>{selected.purpose}</p>
                  <p>Required input: {selected.input}</p>
                  <p>Version: {selected.version}</p>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="coreclaw-query">{queryLabel}</Label>
                <Input
                  id="coreclaw-query"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Example: dentists in Berlin"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coreclaw-location">Location</Label>
                <Input
                  id="coreclaw-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Example: Berlin, Germany"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coreclaw-limit">Limit</Label>
                <Input
                  id="coreclaw-limit"
                  type="number"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                />
              </div>
              <Button onClick={submit} disabled={busy}>
                {busy ? 'Creating...' : 'Create Job'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>CoreClaw Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              {jobs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No CoreClaw jobs yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Worker</TableHead>
                      <TableHead>Query</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Results</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell>{job.worker || job.source}</TableCell>
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
        </Content>
      </div>
    </>
  );
}
