import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { createJob, type Job } from '../api';

const SOURCES = [
  { value: 'google_maps', label: 'Google Maps' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'web', label: 'Web' },
];

export function NewJobSheet({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (job: Job) => void;
}) {
  const [source, setSource] = useState('google_maps');
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [limit, setLimit] = useState('100');
  const [proxy, setProxy] = useState('');
  const [enrichEmail, setEnrichEmail] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError('');
    if (!query.trim()) {
      setError('Query is required.');
      return;
    }
    setBusy(true);
    try {
      const job = await createJob({
        source,
        query: query.trim(),
        location: location.trim(),
        limit: Math.min(1000, Math.max(1, parseInt(limit || '100', 10))),
        enrich_email: enrichEmail,
      });
      localStorage.setItem('omnimerce-proxy', proxy);
      onCreated(job);
      onOpenChange(false);
      setQuery('');
      setLocation('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create job.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>New Job</SheetTitle>
        </SheetHeader>
        <SheetBody className="space-y-5">
          <div className="space-y-2">
            <Label>Source</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger>
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                {SOURCES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="scraper-query">Query</Label>
            <Input
              id="scraper-query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Example: dentists in Berlin"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scraper-location">Location</Label>
            <Input
              id="scraper-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Example: Berlin, Germany"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scraper-limit">Limit</Label>
            <Input
              id="scraper-limit"
              type="number"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scraper-proxy">Proxy</Label>
            <Input
              id="scraper-proxy"
              value={proxy}
              onChange={(e) => setProxy(e.target.value)}
              placeholder="Example: Evomi"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Enrich with email, from published websites only</Label>
            <Switch checked={enrichEmail} onCheckedChange={setEnrichEmail} />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </SheetBody>
        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? 'Creating...' : 'Create Job'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
