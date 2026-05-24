import { useEffect, useState, useCallback } from 'react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Database, Shield, Mail, Globe, BarChart3, AlertCircle, Loader2, Sparkles, Megaphone, DollarSign, RefreshCw, ExternalLink, Check, Star } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { SEOPingCard } from '@/components/admin/SEOPingCard';

interface StripePrices {
  premium: { priceId: string; priceNZD: number; interval: string };
  elite: { priceId: string; priceNZD: number; interval: string };
  spotlight_weekly: { priceId: string; priceNZD: number; interval: string };
  spotlight_monthly: { priceId: string; priceNZD: number; interval: string };
}

export default function AdminSettings() {
  const { settings, loading, updateSetting, refetch } = usePlatformSettings();
  const [categoryLimitInput, setCategoryLimitInput] = useState('');
  const [adsenseIdInput, setAdsenseIdInput] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  
  // Stripe prices state
  const [stripePrices, setStripePrices] = useState<StripePrices | null>(null);
  const [loadingStripePrices, setLoadingStripePrices] = useState(true);
  const [lastPriceRefresh, setLastPriceRefresh] = useState<Date | null>(null);
  
  // Pricing inputs (editable values)
  const [premiumPriceInput, setPremiumPriceInput] = useState('');
  const [elitePriceInput, setElitePriceInput] = useState('');
  const [spotlightWeeklyInput, setSpotlightWeeklyInput] = useState('');
  const [spotlightMonthlyInput, setSpotlightMonthlyInput] = useState('');

  // Fetch Stripe prices
  const fetchStripePrices = useCallback(async () => {
    try {
      setLoadingStripePrices(true);
      const { data, error } = await supabase.functions.invoke('update-stripe-prices', {
        body: { action: 'get' }
      });
      if (error) throw error;
      if (data?.prices) {
        setStripePrices(data.prices);
        setPremiumPriceInput(data.prices.premium?.priceNZD?.toString() || '');
        setElitePriceInput(data.prices.elite?.priceNZD?.toString() || '');
        setSpotlightWeeklyInput(data.prices.spotlight_weekly?.priceNZD?.toString() || '');
        setSpotlightMonthlyInput(data.prices.spotlight_monthly?.priceNZD?.toString() || '');
        setLastPriceRefresh(new Date());
      }
    } catch (error) {
      console.error('Error fetching Stripe prices:', error);
    } finally {
      setLoadingStripePrices(false);
    }
  }, []);

  useEffect(() => {
    if (settings.adsense_publisher_id) {
      setAdsenseIdInput(settings.adsense_publisher_id);
    }
  }, [settings.adsense_publisher_id]);

  // Auto-refresh every 5 seconds
  useAutoRefresh(useCallback(() => { refetch(); }, [refetch]));

  useEffect(() => {
    fetchStripePrices();
  }, [fetchStripePrices]);

  const handleToggle = async (key: keyof typeof settings, value: boolean) => {
    setUpdating(key);
    const success = await updateSetting(key, value);
    if (success) {
      toast.success(`Setting updated`);
    } else {
      toast.error('Failed to update setting');
    }
    setUpdating(null);
  };

  const handleCategoryLimit = async () => {
    const value = categoryLimitInput ? parseInt(categoryLimitInput) : null;
    setUpdating('max_businesses_per_category');
    const success = await updateSetting('max_businesses_per_category', value);
    if (success) {
      toast.success('Category limit updated');
    } else {
      toast.error('Failed to update limit');
    }
    setUpdating(null);
  };

  const handleSpotlightSpeed = async (value: string) => {
    setUpdating('spotlight_rotation_speed');
    const success = await updateSetting('spotlight_rotation_speed', parseInt(value));
    if (success) {
      toast.success('Spotlight speed updated');
    } else {
      toast.error('Failed to update speed');
    }
    setUpdating(null);
  };

  const handleAdFrequency = async (value: string) => {
    setUpdating('ad_frequency_paragraphs');
    const success = await updateSetting('ad_frequency_paragraphs', parseInt(value));
    if (success) {
      toast.success('Ad frequency updated');
    } else {
      toast.error('Failed to update ad frequency');
    }
    setUpdating(null);
  };

  const handleAdsenseId = async () => {
    setUpdating('adsense_publisher_id');
    const success = await updateSetting('adsense_publisher_id', adsenseIdInput);
    if (success) {
      toast.success('AdSense ID updated');
    } else {
      toast.error('Failed to update AdSense ID');
    }
    setUpdating(null);
  };

  const handleStripePriceUpdate = async (plan: string, priceValue: string) => {
    const numValue = parseFloat(priceValue);
    if (isNaN(numValue) || numValue < 0) {
      toast.error('Please enter a valid price');
      return;
    }
    
    setUpdating(`stripe_${plan}`);
    try {
      const { data, error } = await supabase.functions.invoke('update-stripe-prices', {
        body: { 
          action: 'update',
          plan,
          priceNZD: numValue 
        }
      });
      
      if (error) throw error;
      
      toast.success(`${plan.charAt(0).toUpperCase() + plan.slice(1)} price updated in Stripe!`);
      await fetchStripePrices(); // Refresh prices from Stripe
      await refetch(); // Refresh platform settings
    } catch (error: any) {
      console.error('Error updating Stripe price:', error);
      toast.error(error.message || 'Failed to update price in Stripe');
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Settings">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Settings">
      <div className="space-y-6 max-w-3xl">
        {/* Manual Approval Switches - CONTROL LEVERS */}
        <Card className="border-accent/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-accent" />
              Platform Controls
            </CardTitle>
            <CardDescription>
              Control who gets in — scarcity and quality control
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-medium">Pause New Listings</Label>
                <p className="text-sm text-muted-foreground">
                  Stop accepting new business submissions
                </p>
              </div>
              <Switch 
                checked={!settings.allow_new_listings}
                onCheckedChange={(checked) => handleToggle('allow_new_listings', !checked)}
                disabled={updating === 'allow_new_listings'}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-medium">Pause Upgrades</Label>
                <p className="text-sm text-muted-foreground">
                  Temporarily disable subscription upgrades
                </p>
              </div>
              <Switch 
                checked={!settings.allow_upgrades}
                onCheckedChange={(checked) => handleToggle('allow_upgrades', !checked)}
                disabled={updating === 'allow_upgrades'}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-medium">Maintenance Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Only admins can access the site
                </p>
              </div>
              <Switch 
                checked={settings.maintenance_mode}
                onCheckedChange={(checked) => handleToggle('maintenance_mode', checked)}
                disabled={updating === 'maintenance_mode'}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-medium">Show Live Stats Count</Label>
                <p className="text-sm text-muted-foreground">
                  Display live numbers on the Trust Section (verified professionals, businesses, reviews)
                </p>
              </div>
              <Switch 
                checked={settings.show_live_stats_count}
                onCheckedChange={(checked) => handleToggle('show_live_stats_count', checked)}
                disabled={updating === 'show_live_stats_count'}
              />
            </div>
            <Separator />
            <div className="space-y-3">
              <div className="space-y-0.5">
                <Label className="font-medium">Category Capacity Limit</Label>
                <p className="text-sm text-muted-foreground">
                  Max businesses per category (leave empty for unlimited)
                </p>
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="e.g., 50"
                  value={categoryLimitInput || settings.max_businesses_per_category || ''}
                  onChange={(e) => setCategoryLimitInput(e.target.value)}
                  className="max-w-[120px]"
                />
                <Button 
                  variant="outline" 
                  onClick={handleCategoryLimit}
                  disabled={updating === 'max_businesses_per_category'}
                >
                  Save
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Management - Live Stripe Sync */}
        <Card className="border-emerald-500/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-500" />
                  Pricing Management (NZD)
                </CardTitle>
                <CardDescription>
                  Live prices from Stripe. Changes here update both your website AND Stripe instantly.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {lastPriceRefresh && (
                  <span className="text-xs text-muted-foreground">
                    Synced {lastPriceRefresh.toLocaleTimeString()}
                  </span>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={fetchStripePrices}
                  disabled={loadingStripePrices}
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${loadingStripePrices ? 'animate-spin' : ''}`} />
                  Sync
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="https://dashboard.stripe.com/products" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Stripe
                  </a>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingStripePrices ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading prices from Stripe...</span>
              </div>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-medium flex items-center gap-2">
                      Premium Monthly ($NZD)
                      {stripePrices?.premium && (
                        <Badge variant="outline" className="text-xs">
                          {stripePrices.premium.interval}ly
                        </Badge>
                      )}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="149"
                        value={premiumPriceInput}
                        onChange={(e) => setPremiumPriceInput(e.target.value)}
                        className="max-w-[120px]"
                      />
                      <Button 
                        variant="outline" 
                        onClick={() => handleStripePriceUpdate('premium', premiumPriceInput)}
                        disabled={updating === 'stripe_premium'}
                      >
                        {updating === 'stripe_premium' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Update
                          </>
                        )}
                      </Button>
                    </div>
                    {stripePrices?.premium?.priceId && (
                      <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        {stripePrices.premium.priceId}
                      </code>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="font-medium flex items-center gap-2">
                      Elite Monthly ($NZD)
                      {stripePrices?.elite && (
                        <Badge variant="outline" className="text-xs">
                          {stripePrices.elite.interval}ly
                        </Badge>
                      )}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="349"
                        value={elitePriceInput}
                        onChange={(e) => setElitePriceInput(e.target.value)}
                        className="max-w-[120px]"
                      />
                      <Button 
                        variant="outline" 
                        onClick={() => handleStripePriceUpdate('elite', elitePriceInput)}
                        disabled={updating === 'stripe_elite'}
                      >
                        {updating === 'stripe_elite' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Update
                          </>
                        )}
                      </Button>
                    </div>
                    {stripePrices?.elite?.priceId && (
                      <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        {stripePrices.elite.priceId}
                      </code>
                    )}
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-medium flex items-center gap-2">
                      Spotlight Weekly ($NZD)
                      {stripePrices?.spotlight_weekly && (
                        <Badge variant="outline" className="text-xs">
                          {stripePrices.spotlight_weekly.interval}ly
                        </Badge>
                      )}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="99"
                        value={spotlightWeeklyInput}
                        onChange={(e) => setSpotlightWeeklyInput(e.target.value)}
                        className="max-w-[120px]"
                      />
                      <Button 
                        variant="outline" 
                        onClick={() => handleStripePriceUpdate('spotlight_weekly', spotlightWeeklyInput)}
                        disabled={updating === 'stripe_spotlight_weekly'}
                      >
                        {updating === 'stripe_spotlight_weekly' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Update
                          </>
                        )}
                      </Button>
                    </div>
                    {stripePrices?.spotlight_weekly?.priceId && (
                      <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        {stripePrices.spotlight_weekly.priceId}
                      </code>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="font-medium flex items-center gap-2">
                      Spotlight Monthly ($NZD)
                      {stripePrices?.spotlight_monthly && (
                        <Badge variant="outline" className="text-xs">
                          {stripePrices.spotlight_monthly.interval}ly
                        </Badge>
                      )}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="299"
                        value={spotlightMonthlyInput}
                        onChange={(e) => setSpotlightMonthlyInput(e.target.value)}
                        className="max-w-[120px]"
                      />
                      <Button 
                        variant="outline" 
                        onClick={() => handleStripePriceUpdate('spotlight_monthly', spotlightMonthlyInput)}
                        disabled={updating === 'stripe_spotlight_monthly'}
                      >
                        {updating === 'stripe_spotlight_monthly' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Update
                          </>
                        )}
                      </Button>
                    </div>
                    {stripePrices?.spotlight_monthly?.priceId && (
                      <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        {stripePrices.spotlight_monthly.priceId}
                      </code>
                    )}
                  </div>
                </div>
              </>
            )}
            
            <Separator />
            
            <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 text-sm">
              <p className="font-medium text-foreground mb-2 flex items-center gap-2">
                <Check className="h-4 w-4 text-accent" />
                Live Stripe Sync
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Prices are fetched directly from your Stripe account</li>
                <li>Updating a price creates a new Stripe price and archives the old one</li>
                <li>Changes apply immediately to new checkouts</li>
                <li>Existing subscriptions keep their original price until renewal</li>
                <li>All prices include GST (15%)</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Spotlight Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              Spotlight Settings
            </CardTitle>
            <CardDescription>
              Configure the rotating Spotlight bar at the top of the homepage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-medium">Rotation Speed</Label>
                <p className="text-sm text-muted-foreground">
                  How long each business appears before rotating
                </p>
              </div>
              <Select
                value={String(settings.spotlight_rotation_speed)}
                onValueChange={handleSpotlightSpeed}
                disabled={updating === 'spotlight_rotation_speed'}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3000">3 seconds</SelectItem>
                  <SelectItem value="5000">5 seconds</SelectItem>
                  <SelectItem value="7000">7 seconds</SelectItem>
                  <SelectItem value="10000">10 seconds</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Reviews Settings */}
        <Card className="border-purple-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-purple-500" />
              Reviews Management
            </CardTitle>
            <CardDescription>
              Control how reviews are handled
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-medium">Auto-Publish Reviews</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically approve all reviews without manual moderation
                </p>
              </div>
              <Switch 
                checked={settings.reviews_auto_publish}
                onCheckedChange={(checked) => handleToggle('reviews_auto_publish', checked)}
                disabled={updating === 'reviews_auto_publish'}
              />
            </div>
            {settings.reviews_auto_publish && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm text-amber-700 dark:text-amber-400">
                <AlertCircle className="h-4 w-4 inline mr-2" />
                Reviews will publish immediately. You can still delete inappropriate reviews from the Reviews page.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Advertising Settings */}
        <Card className="border-amber-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-amber-500" />
              Advertising & Monetization
            </CardTitle>
            <CardDescription>
              Control ads across blog posts and site
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-medium">Enable Ads Globally</Label>
                <p className="text-sm text-muted-foreground">
                  Show ads across all blog posts (can be overridden per article)
                </p>
              </div>
              <Switch 
                checked={settings.ads_enabled_globally}
                onCheckedChange={(checked) => handleToggle('ads_enabled_globally', checked)}
                disabled={updating === 'ads_enabled_globally'}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-medium">Ad Frequency</Label>
                <p className="text-sm text-muted-foreground">
                  Show inline ad every X paragraphs in articles
                </p>
              </div>
              <Select
                value={String(settings.ad_frequency_paragraphs)}
                onValueChange={handleAdFrequency}
                disabled={updating === 'ad_frequency_paragraphs'}
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
            <Separator />
            <div className="space-y-3">
              <div className="space-y-0.5">
                <Label className="font-medium">AdSense Publisher ID</Label>
                <p className="text-sm text-muted-foreground">
                  Your Google AdSense publisher ID (ca-pub-XXXXXXXXXXXXXXXX)
                </p>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="ca-pub-XXXXXXXXXXXXXXXX"
                  value={adsenseIdInput}
                  onChange={(e) => setAdsenseIdInput(e.target.value)}
                  className="max-w-[280px]"
                />
                <Button 
                  variant="outline" 
                  onClick={handleAdsenseId}
                  disabled={updating === 'adsense_publisher_id'}
                >
                  Save
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analytics Setup */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Analytics & Tracking
            </CardTitle>
            <CardDescription>
              Google Analytics and conversion tracking
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4 text-sm">
              <p className="font-medium mb-2">Conversion Events Tracked:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• <code className="text-xs bg-background px-1 rounded">contact_business</code> — When someone submits a lead</li>
                <li>• <code className="text-xs bg-background px-1 rounded">list_business_complete</code> — When a business submits listing</li>
                <li>• <code className="text-xs bg-background px-1 rounded">upgrade_click</code> — When someone clicks upgrade</li>
                <li>• <code className="text-xs bg-background px-1 rounded">sign_up</code> — New user registration</li>
              </ul>
            </div>
            <Separator />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Setup Instructions:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Create a Google Analytics 4 property</li>
                <li>Get your Measurement ID (G-XXXXXXXXXX)</li>
                <li>Add to your environment variables</li>
                <li>Set up Google Search Console and verify ownership</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Platform Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Platform Status
            </CardTitle>
            <CardDescription>
              Current platform configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">New Listings</span>
              <Badge variant={settings.allow_new_listings ? "default" : "destructive"}>
                {settings.allow_new_listings ? 'Open' : 'Paused'}
              </Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm">Upgrades</span>
              <Badge variant={settings.allow_upgrades ? "default" : "destructive"}>
                {settings.allow_upgrades ? 'Open' : 'Paused'}
              </Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm">Category Limit</span>
              <Badge variant="secondary">
                {settings.max_businesses_per_category || 'Unlimited'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security
            </CardTitle>
            <CardDescription>
              Security and authentication settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-confirm Email Signups</Label>
                <p className="text-sm text-muted-foreground">
                  Skip email verification for new users
                </p>
              </div>
              <Badge variant="secondary">Enabled</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Email Templates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Notifications
            </CardTitle>
            <CardDescription>
              Configure automated email notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Listing Approval</Label>
                <p className="text-sm text-muted-foreground">
                  Notify business owners when listings are approved
                </p>
              </div>
              <Switch 
                checked={settings.email_notify_listing_approval}
                onCheckedChange={(checked) => handleToggle('email_notify_listing_approval', checked)}
                disabled={updating === 'email_notify_listing_approval'}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>New Lead Notification</Label>
                <p className="text-sm text-muted-foreground">
                  Notify business owners when they receive new leads
                </p>
              </div>
              <Switch 
                checked={settings.email_notify_new_lead}
                onCheckedChange={(checked) => handleToggle('email_notify_new_lead', checked)}
                disabled={updating === 'email_notify_new_lead'}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Job Application Notification</Label>
                <p className="text-sm text-muted-foreground">
                  Notify employers when they receive new job applications
                </p>
              </div>
              <Switch 
                checked={settings.email_notify_job_application}
                onCheckedChange={(checked) => handleToggle('email_notify_job_application', checked)}
                disabled={updating === 'email_notify_job_application'}
              />
            </div>
          </CardContent>
        </Card>

        {/* SEO Domination */}
        <SEOPingCard />

        {/* Database Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              System Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Backend</span>
                <Badge variant="secondary">Wellington EcoBuild Cloud</Badge>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payments</span>
                <Badge variant="secondary">Stripe</Badge>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Region</span>
                <span>Wellington, NZ</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}