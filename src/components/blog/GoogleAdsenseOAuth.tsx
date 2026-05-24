import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Link, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ExternalLink,
  Key,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

interface OAuthCredentials {
  client_id: string;
  client_secret: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
}

export function GoogleAdsenseOAuth() {
  const queryClient = useQueryClient();
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [saving, setSaving] = useState(false);

  // Fetch stored credentials
  const { data: credentials, isLoading } = useQuery({
    queryKey: ['adsense-oauth-credentials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'adsense_api_credentials')
        .maybeSingle();
      if (error) throw error;
      return data?.value as unknown as OAuthCredentials | null;
    },
  });

  useEffect(() => {
    if (credentials) {
      setClientId(credentials.client_id || '');
      // Don't show client secret for security
    }
  }, [credentials]);

  const isConnected = credentials?.access_token && credentials?.refresh_token;
  const isExpired = credentials?.expires_at && credentials.expires_at < Date.now();

  const saveCredentialsMutation = useMutation({
    mutationFn: async () => {
      const newCredentials: OAuthCredentials = {
        client_id: clientId,
        client_secret: clientSecret,
        ...(credentials?.access_token && { access_token: credentials.access_token }),
        ...(credentials?.refresh_token && { refresh_token: credentials.refresh_token }),
        ...(credentials?.expires_at && { expires_at: credentials.expires_at }),
      };

      const { data: existing } = await supabase
        .from('platform_settings')
        .select('id')
        .eq('key', 'adsense_api_credentials')
        .maybeSingle();

      if (existing) {
        await supabase
          .from('platform_settings')
          .update({ value: newCredentials as unknown as Json })
          .eq('key', 'adsense_api_credentials');
      } else {
        await supabase
          .from('platform_settings')
          .insert([{ key: 'adsense_api_credentials', value: newCredentials as unknown as Json }]);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adsense-oauth-credentials'] });
      toast.success('OAuth credentials saved');
      setClientSecret(''); // Clear secret after saving
    },
    onError: () => toast.error('Failed to save credentials'),
  });

  const handleOAuthFlow = () => {
    if (!clientId) {
      toast.error('Please enter your Client ID first');
      return;
    }

    // Construct Google OAuth URL
    const redirectUri = `${window.location.origin}/admin/adsense/callback`;
    const scope = 'https://www.googleapis.com/auth/adsense.readonly';
    
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    // Open OAuth popup
    window.open(authUrl.toString(), 'GoogleOAuth', 'width=500,height=600');
  };

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const newCredentials: OAuthCredentials = {
        client_id: credentials?.client_id || '',
        client_secret: credentials?.client_secret || '',
      };

      await supabase
        .from('platform_settings')
        .update({ value: newCredentials as unknown as Json })
        .eq('key', 'adsense_api_credentials');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adsense-oauth-credentials'] });
      toast.success('Disconnected from Google AdSense');
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-amber-500" />
              Google AdSense API Connection
            </CardTitle>
            <CardDescription>
              Connect to Google AdSense API to fetch real performance metrics
            </CardDescription>
          </div>
          {isConnected && !isExpired && (
            <Badge className="bg-emerald-500/10 text-emerald-500 gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Connected
            </Badge>
          )}
          {isConnected && isExpired && (
            <Badge className="bg-amber-500/10 text-amber-500 gap-1">
              <AlertTriangle className="h-3 w-3" />
              Token Expired
            </Badge>
          )}
          {!isConnected && (
            <Badge variant="secondary" className="gap-1">
              <XCircle className="h-3 w-3" />
              Not Connected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Setup Instructions */}
        <Alert className="border-blue-500/30 bg-blue-500/5">
          <AlertDescription className="text-sm space-y-2">
            <p className="font-medium">To connect Google AdSense API:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Google Cloud Console</a></li>
              <li>Create OAuth 2.0 credentials (Web application type)</li>
              <li>Add <code className="bg-muted px-1 rounded">{window.location.origin}/admin/adsense/callback</code> as Authorized redirect URI</li>
              <li>Enable the AdSense Management API</li>
              <li>Enter your Client ID and Client Secret below</li>
            </ol>
          </AlertDescription>
        </Alert>

        {/* OAuth Credentials Form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>OAuth Client ID</Label>
            <Input
              placeholder="xxxxx.apps.googleusercontent.com"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label>OAuth Client Secret</Label>
            <Input
              type="password"
              placeholder={credentials?.client_secret ? '••••••••••••' : 'Enter client secret'}
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Client secret is stored securely and never displayed
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => saveCredentialsMutation.mutate()}
              disabled={!clientId || saveCredentialsMutation.isPending}
            >
              {saveCredentialsMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Save Credentials
            </Button>

            {clientId && credentials?.client_secret && (
              <Button
                variant="outline"
                onClick={handleOAuthFlow}
                disabled={!clientId}
              >
                <Link className="h-4 w-4 mr-2" />
                {isConnected ? 'Reconnect' : 'Connect'} to Google
              </Button>
            )}
          </div>
        </div>

        {/* Connection Status */}
        {isConnected && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">API Access Active</p>
                <p className="text-xs text-muted-foreground">
                  {isExpired 
                    ? 'Token has expired. Click Reconnect to refresh.' 
                    : 'Your AdSense performance data will be fetched automatically'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => disconnectMutation.mutate()}
              >
                Disconnect
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
