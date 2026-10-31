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
import {
  clearCoreClawToken,
  fetchCoreClawTokenStatus,
  saveCoreClawToken,
  type CoreClawTokenStatus,
} from '../../api';

export function ScraperSettingsPage() {
  const [endpoint, setEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [proxy, setProxy] = useState('');
  const [costLimit, setCostLimit] = useState('');
  const [saved, setSaved] = useState(false);
  const [coreClawToken, setCoreClawToken] = useState('');
  const [coreClawStatus, setCoreClawStatus] =
    useState<CoreClawTokenStatus | null>(null);
  const [coreClawMessage, setCoreClawMessage] = useState('');
  const [coreClawError, setCoreClawError] = useState('');
  const [coreClawBusy, setCoreClawBusy] = useState(false);

  useEffect(() => {
    setEndpoint(localStorage.getItem('omnimerce-endpoint') || '');
    setProxy(localStorage.getItem('omnimerce-proxy') || '');
    setCostLimit(localStorage.getItem('omnimerce-cost-limit') || '');
    fetchCoreClawTokenStatus()
      .then(setCoreClawStatus)
      .catch(() => {});
  }, []);

  function save() {
    localStorage.setItem('omnimerce-endpoint', endpoint);
    localStorage.setItem('omnimerce-proxy', proxy);
    localStorage.setItem('omnimerce-cost-limit', costLimit);
    setSaved(true);
  }

  async function saveCoreClaw() {
    setCoreClawMessage('');
    setCoreClawError('');
    if (!coreClawToken.trim()) {
      setCoreClawError('CoreClaw API token is required.');
      return;
    }
    setCoreClawBusy(true);
    try {
      const status = await saveCoreClawToken(coreClawToken.trim());
      setCoreClawStatus(status);
      setCoreClawToken('');
      setCoreClawMessage('Saved and verified with CoreClaw.');
    } catch (e) {
      setCoreClawError(
        e instanceof Error ? e.message : 'Failed to save CoreClaw token.',
      );
    } finally {
      setCoreClawBusy(false);
    }
  }

  async function clearCoreClaw() {
    setCoreClawMessage('');
    setCoreClawError('');
    setCoreClawBusy(true);
    try {
      const status = await clearCoreClawToken();
      setCoreClawStatus(status);
      setCoreClawToken('');
      setCoreClawMessage('CoreClaw token cleared.');
    } catch (e) {
      setCoreClawError(
        e instanceof Error ? e.message : 'Failed to clear CoreClaw token.',
      );
    } finally {
      setCoreClawBusy(false);
    }
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
          <Card>
            <CardHeader>
              <CardTitle>CoreClaw</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm text-muted-foreground">
                Status:{' '}
                {coreClawStatus
                  ? coreClawStatus.configured
                    ? `Connected${
                        coreClawStatus.source
                          ? ` via ${coreClawStatus.source === 'env' ? 'Coolify env' : 'Settings'}`
                          : ''
                      }${coreClawStatus.masked_hint ? ` (${coreClawStatus.masked_hint})` : ''}`
                    : 'Not connected'
                  : 'Loading'}
              </p>
              <div className="space-y-2">
                <Label htmlFor="settings-coreclaw-token">
                  CoreClaw API token
                </Label>
                <Input
                  id="settings-coreclaw-token"
                  type="password"
                  value={coreClawToken}
                  onChange={(e) => setCoreClawToken(e.target.value)}
                  placeholder="Paste your CoreClaw Personal API token"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                The token is verified with CoreClaw before it is saved,
                and is stored on the server, not in this browser. It is
                never shown back in full. A token saved here lives on
                the running container and will need to be saved again
                after a redeploy that replaces the container. For a
                persistent token, set CORECLAW_TOKEN in Coolify instead.
              </p>
              <div className="flex gap-2">
                <Button onClick={saveCoreClaw} disabled={coreClawBusy}>
                  {coreClawBusy ? 'Saving...' : 'Save CoreClaw Token'}
                </Button>
                <Button
                  variant="outline"
                  onClick={clearCoreClaw}
                  disabled={coreClawBusy}
                >
                  Clear
                </Button>
              </div>
              {coreClawMessage ? (
                <p className="text-sm text-muted-foreground">
                  {coreClawMessage}
                </p>
              ) : null}
              {coreClawError ? (
                <p className="text-sm text-destructive">{coreClawError}</p>
              ) : null}
            </CardContent>
          </Card>
        </Content>
      </div>
    </>
  );
}
