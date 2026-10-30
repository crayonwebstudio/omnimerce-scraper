import { useEffect, useState } from 'react';
import { Content } from '@/crm/layout/components/content';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScraperPageHeader } from '../../components/page-header';

export function ScraperSettingsPage() {
  const [endpoint, setEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [proxy, setProxy] = useState('');
  const [costLimit, setCostLimit] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setEndpoint(localStorage.getItem('omnimerce-endpoint') || '');
    setProxy(localStorage.getItem('omnimerce-proxy') || '');
    setCostLimit(localStorage.getItem('omnimerce-cost-limit') || '');
  }, []);

  function save() {
    localStorage.setItem('omnimerce-endpoint', endpoint);
    localStorage.setItem('omnimerce-proxy', proxy);
    localStorage.setItem('omnimerce-cost-limit', costLimit);
    setSaved(true);
  }

  return (
    <>
      <ScraperPageHeader
        title="Settings"
        description="Omnimerce endpoint, proxy, and cost limits. Settings are saved in this browser only for now, and no secrets are stored in the repo."
      />
      <div className="container-fluid">
        <Content className="block py-5">
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="settings-endpoint">
                  Omnimerce endpoint URL
                </Label>
                <Input
                  id="settings-endpoint"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder="Example: https://example.com/api/v1/muse-responses"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-key">API key, masked</Label>
                <Input
                  id="settings-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Stored in browser only, not sent to the server"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-proxy">Proxy provider</Label>
                <Input
                  id="settings-proxy"
                  value={proxy}
                  onChange={(e) => setProxy(e.target.value)}
                  placeholder="Example: Evomi"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-cost">Cost limit, per job</Label>
                <Input
                  id="settings-cost"
                  value={costLimit}
                  onChange={(e) => setCostLimit(e.target.value)}
                  placeholder="Example: 5"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                LinkedIn guardrail: public research only, no automated
                LinkedIn scraping, no guessed links or emails.
              </p>
              <Button onClick={save}>Save Settings</Button>
              {saved ? (
                <p className="text-sm text-muted-foreground">Saved.</p>
              ) : null}
            </CardContent>
          </Card>
        </Content>
      </div>
    </>
  );
}
