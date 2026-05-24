import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Megaphone, 
  Settings, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Loader2,
  Save,
  LayoutGrid,
  FileText,
  Shield,
  ExternalLink,
  Info,
  BarChart3,
  FlaskConical
} from 'lucide-react';
import { toast } from 'sonner';
import { AdsensePerformanceDashboard } from '@/components/blog/AdsensePerformanceDashboard';
import { AdABTesting } from '@/components/blog/AdABTesting';
import { GoogleAdsenseOAuth } from '@/components/blog/GoogleAdsenseOAuth';

interface AdPlacementPositions {
  after_first_paragraph: boolean;
  mid_article: boolean;
  end_of_article: boolean;
  sidebar: boolean;
}

interface AdsenseSettings {
  adsense_enabled: boolean;
  adsense_publisher_id: string;
  adsense_auto_ads_code: string;
  adsense_ad_positions: AdPlacementPositions;
  adsense_max_ads_per_page: number;
  adsense_connection_status: 'connected' | 'not_connected' | 'error';
  ads_enabled_globally: boolean;
  ad_frequency_paragraphs: number;
}

const defaultSettings: AdsenseSettings = {
  adsense_enabled: false,
  adsense_publisher_id: '',
  adsense_auto_ads_code: '',
  adsense_ad_positions: {
    after_first_paragraph: true,
    mid_article: true,
    end_of_article: true,
    sidebar: true,
  },
  adsense_max_ads_per_page: 3,
  adsense_connection_status: 'not_connected',
  ads_enabled_globally: true,
  ad_frequency_paragraphs: 5,
};

export default function AdminAdsense() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<AdsenseSettings>(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [publisherIdInput, setPublisherIdInput] = useState('');
  const [autoAdsCodeInput, setAutoAdsCodeInput] = useState('');

  // Fetch settings
  const { data: platformSettings, isLoading } = useQuery({
    queryKey: ['adsense-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('key, value')
        .in('key', [
          'adsense_enabled',
          'adsense_publisher_id',
          'adsense_auto_ads_code',
          'adsense_ad_positions',
          'adsense_max_ads_per_page',
          'adsense_connection_status',
          'ads_enabled_globally',
          'ad_frequency_paragraphs',
        ]);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (platformSettings) {
      const newSettings = { ...defaultSettings };
      platformSettings.forEach((row) => {
        if (row.key === 'adsense_enabled') newSettings.adsense_enabled = row.value as boolean;
        if (row.key === 'adsense_publisher_id') {
          newSettings.adsense_publisher_id = (row.value as string) || '';
          setPublisherIdInput((row.value as string) || '');
        }
        if (row.key === 'adsense_auto_ads_code') {
          newSettings.adsense_auto_ads_code = (row.value as string) || '';
          setAutoAdsCodeInput((row.value as string) || '');
        }
        if (row.key === 'adsense_ad_positions') newSettings.adsense_ad_positions = row.value as unknown as AdPlacementPositions;
        if (row.key === 'adsense_max_ads_per_page') newSettings.adsense_max_ads_per_page = row.value as number;
        if (row.key === 'adsense_connection_status') newSettings.adsense_connection_status = row.value as 'connected' | 'not_connected' | 'error';
        if (row.key === 'ads_enabled_globally') newSettings.ads_enabled_globally = row.value as boolean;
        if (row.key === 'ad_frequency_paragraphs') newSettings.ad_frequency_paragraphs = row.value as number;
      });
      setSettings(newSettings);
    }
  }, [platformSettings]);

  const updateSetting = async (key: string, value: any) => {
    const { data: existing } = await supabase
      .from('platform_settings')
      .select('id')
      .eq('key', key)
      .maybeSingle();

    if (existing) {
      await supabase.from('platform_settings').update({ value }).eq('key', key);
    } else {
      await supabase.from('platform_settings').insert({ key, value });
    }
  };

  const handleToggle = async (key: keyof AdsenseSettings, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    await updateSetting(key, value);
    queryClient.invalidateQueries({ queryKey: ['adsense-settings'] });
    toast.success('Setting updated');
  };

  const handlePositionToggle = async (position: keyof AdPlacementPositions, value: boolean) => {
    const newPositions = { ...settings.adsense_ad_positions, [position]: value };
    setSettings((prev) => ({ ...prev, adsense_ad_positions: newPositions }));
    await updateSetting('adsense_ad_positions', newPositions);
    queryClient.invalidateQueries({ queryKey: ['adsense-settings'] });
    toast.success('Ad position updated');
  };

  const normalizePublisherId = (raw: string) => {
    const trimmed = raw.trim();

    // If they pasted the whole script/snippet, extract the publisher id
    const extracted = trimmed.match(/ca-pub-\d+/)?.[0];
    if (extracted) return extracted;

    // Allow "pub-..." (common shorthand) and normalize to "ca-pub-..."
    if (/^pub-\d+$/.test(trimmed)) return `ca-${trimmed}`;

    return trimmed;
  };

  const handleSavePublisherId = async () => {
    setSaving(true);
    try {
      const normalized = normalizePublisherId(publisherIdInput);
      setPublisherIdInput(normalized);

      await updateSetting('adsense_publisher_id', normalized);
      const isValidId = /^ca-pub-\d+$/.test(normalized);
      await updateSetting(
        'adsense_connection_status',
        isValidId ? 'connected' : normalized ? 'error' : 'not_connected'
      );

      setSettings((prev) => ({
        ...prev,
        adsense_publisher_id: normalized,
        adsense_connection_status: isValidId ? 'connected' : normalized ? 'error' : 'not_connected',
      }));

      queryClient.invalidateQueries({ queryKey: ['adsense-settings'] });
      toast.success(isValidId ? 'AdSense Publisher ID saved' : 'Saved, but Publisher ID format looks wrong');
    } catch (error) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAutoAdsCode = async () => {
    setSaving(true);
    try {
      await updateSetting('adsense_auto_ads_code', autoAdsCodeInput);
      setSettings((prev) => ({ ...prev, adsense_auto_ads_code: autoAdsCodeInput }));
      queryClient.invalidateQueries({ queryKey: ['adsense-settings'] });
      toast.success('Auto Ads code saved');
    } catch (error) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleMaxAdsChange = async (value: string) => {
    const numValue = parseInt(value);
    setSettings((prev) => ({ ...prev, adsense_max_ads_per_page: numValue }));
    await updateSetting('adsense_max_ads_per_page', numValue);
    queryClient.invalidateQueries({ queryKey: ['adsense-settings'] });
    toast.success('Max ads per page updated');
  };

  const handleFrequencyChange = async (value: string) => {
    const numValue = parseInt(value);
    setSettings((prev) => ({ ...prev, ad_frequency_paragraphs: numValue }));
    await updateSetting('ad_frequency_paragraphs', numValue);
    queryClient.invalidateQueries({ queryKey: ['adsense-settings'] });
    toast.success('Ad frequency updated');
  };

  const getConnectionStatus = () => {
    switch (settings.adsense_connection_status) {
      case 'connected':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-500 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Connected
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Invalid ID
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Not Connected
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="AdSense">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="AdSense">
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Megaphone className="h-6 w-6 text-amber-500" />
              Google AdSense Integration
            </h1>
            <p className="text-muted-foreground">
              Monetize blog posts and articles without degrading premium brand value
            </p>
          </div>
          {getConnectionStatus()}
        </div>

        {/* Important Notice */}
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <Shield className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-sm">
            <strong>Brand Protection:</strong> Ads only appear on blog posts and articles. 
            They will never appear on business listings, category pages, company profiles, 
            pricing pages, job listings, homepage hero, or the admin dashboard.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="connection" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="connection" className="gap-2">
              <Settings className="h-4 w-4" />
              Connection
            </TabsTrigger>
            <TabsTrigger value="performance" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="ab-testing" className="gap-2">
              <FlaskConical className="h-4 w-4" />
              A/B Testing
            </TabsTrigger>
            <TabsTrigger value="placements" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              Placements
            </TabsTrigger>
            <TabsTrigger value="articles" className="gap-2">
              <FileText className="h-4 w-4" />
              Article Settings
            </TabsTrigger>
          </TabsList>

          {/* Connection Tab */}
          <TabsContent value="connection" className="space-y-4">
            {/* Master Toggle */}
            <Card className="border-2 border-amber-500/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-lg font-semibold flex items-center gap-2">
                      {settings.adsense_enabled ? (
                        <Eye className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <EyeOff className="h-5 w-5 text-muted-foreground" />
                      )}
                      AdSense Master Switch
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Enable or disable all ads across the platform instantly
                    </p>
                  </div>
                  <Switch 
                    checked={settings.adsense_enabled}
                    onCheckedChange={(checked) => handleToggle('adsense_enabled', checked)}
                    className="scale-125"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Publisher ID */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">AdSense Publisher ID</CardTitle>
                <CardDescription>
                  Your Google AdSense publisher ID (format: ca-pub-XXXXXXXXXXXXXXXX)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="ca-pub-XXXXXXXXXXXXXXXX"
                    value={publisherIdInput}
                    onChange={(e) => setPublisherIdInput(e.target.value)}
                    className="font-mono"
                  />
                  <Button onClick={handleSavePublisherId} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Save
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  Find your Publisher ID in your{' '}
                  <a 
                    href="https://www.google.com/adsense" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-accent hover:underline inline-flex items-center gap-1"
                  >
                    AdSense account <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </CardContent>
            </Card>

            {/* Auto Ads Code (Optional) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Auto Ads Script (Optional)</CardTitle>
                <CardDescription>
                  Paste your complete AdSense Auto Ads script if you want automatic ad placement
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder='<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" crossorigin="anonymous"></script>'
                  value={autoAdsCodeInput}
                  onChange={(e) => setAutoAdsCodeInput(e.target.value)}
                  rows={4}
                  className="font-mono text-sm"
                />
                <Button onClick={handleSaveAutoAdsCode} disabled={saving} variant="outline">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Auto Ads Code
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-4">
            <GoogleAdsenseOAuth />
            <AdsensePerformanceDashboard />
          </TabsContent>

          {/* A/B Testing Tab */}
          <TabsContent value="ab-testing" className="space-y-4">
            <AdABTesting />
          </TabsContent>

          {/* Placements Tab */}
          <TabsContent value="placements" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ad Placement Positions</CardTitle>
                <CardDescription>
                  Control where ads appear within blog posts and articles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-0.5">
                    <Label className="font-medium">After First Paragraph</Label>
                    <p className="text-sm text-muted-foreground">
                      Show ad immediately after the opening paragraph
                    </p>
                  </div>
                  <Switch 
                    checked={settings.adsense_ad_positions.after_first_paragraph}
                    onCheckedChange={(checked) => handlePositionToggle('after_first_paragraph', checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-0.5">
                    <Label className="font-medium">Mid-Article</Label>
                    <p className="text-sm text-muted-foreground">
                      Show ads at regular intervals within the article body
                    </p>
                  </div>
                  <Switch 
                    checked={settings.adsense_ad_positions.mid_article}
                    onCheckedChange={(checked) => handlePositionToggle('mid_article', checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-0.5">
                    <Label className="font-medium">End of Article</Label>
                    <p className="text-sm text-muted-foreground">
                      Show ad after the article content ends
                    </p>
                  </div>
                  <Switch 
                    checked={settings.adsense_ad_positions.end_of_article}
                    onCheckedChange={(checked) => handlePositionToggle('end_of_article', checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-0.5">
                    <Label className="font-medium">Sidebar (Desktop Only)</Label>
                    <p className="text-sm text-muted-foreground">
                      Show sticky ad in the sidebar on desktop screens
                    </p>
                  </div>
                  <Switch 
                    checked={settings.adsense_ad_positions.sidebar}
                    onCheckedChange={(checked) => handlePositionToggle('sidebar', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Limits */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ad Limits</CardTitle>
                <CardDescription>
                  Prevent ad clutter and maintain a clean reading experience
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="font-medium">Max Ads Per Page</Label>
                    <p className="text-sm text-muted-foreground">
                      Maximum number of ads shown per article
                    </p>
                  </div>
                  <Select
                    value={String(settings.adsense_max_ads_per_page)}
                    onValueChange={handleMaxAdsChange}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 ad</SelectItem>
                      <SelectItem value="2">2 ads</SelectItem>
                      <SelectItem value="3">3 ads</SelectItem>
                      <SelectItem value="4">4 ads</SelectItem>
                      <SelectItem value="5">5 ads</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="font-medium">Inline Ad Frequency</Label>
                    <p className="text-sm text-muted-foreground">
                      Show an inline ad every X paragraphs
                    </p>
                  </div>
                  <Select
                    value={String(settings.ad_frequency_paragraphs)}
                    onValueChange={handleFrequencyChange}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 paragraphs</SelectItem>
                      <SelectItem value="5">5 paragraphs</SelectItem>
                      <SelectItem value="7">7 paragraphs</SelectItem>
                      <SelectItem value="10">10 paragraphs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Article Settings Tab */}
          <TabsContent value="articles" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Default Article Behavior</CardTitle>
                <CardDescription>
                  These settings apply to all new articles by default
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-0.5">
                    <Label className="font-medium">Enable Ads Globally for Articles</Label>
                    <p className="text-sm text-muted-foreground">
                      New articles will have ads enabled by default (can be overridden per article)
                    </p>
                  </div>
                  <Switch 
                    checked={settings.ads_enabled_globally}
                    onCheckedChange={(checked) => handleToggle('ads_enabled_globally', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Per-Article Controls</CardTitle>
                <CardDescription>
                  Individual article ad settings are available in the blog editor
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 border border-border rounded-lg p-4 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-2">Available in Article Editor:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Toggle: "Enable ads on this article"</li>
                    <li>Custom ad placement positions per article</li>
                    <li>Preview mode showing ad spacing (placeholders)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Compliance Info */}
            <Card className="border-blue-500/30">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-500" />
                  AdSense Policy Compliance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />
                    <span>Ads are lazy-loaded for fast page speed</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />
                    <span>No layout shift (CLS protection)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />
                    <span>Mobile-friendly responsive ad sizing</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />
                    <span>No pop-ups or autoplay video ads</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />
                    <span>No deceptive ad placement</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />
                    <span>Respects user cookie consent preferences</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
