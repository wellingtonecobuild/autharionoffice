import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Settings,
  Shield,
  Clock,
  Bell,
  Pause,
  Play,
  Save,
  AlertTriangle,
  Wrench,
  Lock,
} from 'lucide-react';

interface AIAgentSettingsProps {
  onSaveSuccess?: () => void;
}

const AIAgentSettings = ({ onSaveSuccess }: AIAgentSettingsProps) => {
  const queryClient = useQueryClient();
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // Fetch current settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['ai-agent-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_agent_settings')
        .select('*');
      if (error) throw error;
      
      // Convert array to object keyed by setting_key
      const settingsMap: Record<string, any> = {};
      data?.forEach((s: any) => {
        settingsMap[s.setting_key] = s.setting_value;
      });
      return settingsMap;
    },
  });

  // Local state for settings
  const [localSettings, setLocalSettings] = useState<Record<string, any>>({});

  // Initialize local settings when data loads
  const effectiveSettings = { ...settings, ...localSettings };

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const promises = Object.entries(updates).map(([key, value]) =>
        supabase
          .from('ai_agent_settings')
          .update({ 
            setting_value: value,
            updated_at: new Date().toISOString(),
          })
          .eq('setting_key', key)
      );
      
      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) throw new Error('Failed to save some settings');
    },
    onSuccess: () => {
      toast.success('Settings saved successfully');
      setUnsavedChanges(false);
      setLocalSettings({});
      queryClient.invalidateQueries({ queryKey: ['ai-agent-settings'] });
      onSaveSuccess?.();
    },
    onError: (error: any) => {
      toast.error(`Failed to save settings: ${error.message}`);
    },
  });

  const updateSetting = (key: string, path: string, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || settings?.[key] || {}),
        [path]: value,
      },
    }));
    setUnsavedChanges(true);
  };

  const handleSave = () => {
    saveMutation.mutate(localSettings);
  };

  const togglePause = async () => {
    const isCurrentlyEnabled = effectiveSettings.monitoring_active?.enabled ?? true;
    const newValue = {
      enabled: !isCurrentlyEnabled,
      paused_at: !isCurrentlyEnabled ? null : new Date().toISOString(),
    };
    
    updateSetting('monitoring_active', 'enabled', !isCurrentlyEnabled);
    if (!isCurrentlyEnabled) {
      updateSetting('monitoring_active', 'paused_at', null);
    } else {
      updateSetting('monitoring_active', 'paused_at', new Date().toISOString());
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading settings...
        </CardContent>
      </Card>
    );
  }

  const isMonitoringActive = effectiveSettings.monitoring_active?.enabled ?? true;

  return (
    <div className="space-y-6">
      {/* Monitoring Status */}
      <Card className={isMonitoringActive ? 'border-green-200 dark:border-green-800' : 'border-yellow-200 dark:border-yellow-800'}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isMonitoringActive ? (
                <Play className="h-5 w-5 text-green-500" />
              ) : (
                <Pause className="h-5 w-5 text-yellow-500" />
              )}
              <CardTitle>Monitoring Status</CardTitle>
            </div>
            <Badge variant={isMonitoringActive ? 'default' : 'secondary'}>
              {isMonitoringActive ? 'Active' : 'Paused'}
            </Badge>
          </div>
          <CardDescription>
            {isMonitoringActive 
              ? 'AI agent is actively monitoring the system'
              : 'AI agent monitoring is temporarily paused'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant={isMonitoringActive ? 'outline' : 'default'}
            onClick={togglePause}
          >
            {isMonitoringActive ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Pause Monitoring
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Resume Monitoring
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Scan Frequency */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Scan Frequency</CardTitle>
          </div>
          <CardDescription>
            How often the AI agent should run automated scans
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={effectiveSettings.scan_frequency?.value || 'daily'}
            onValueChange={(value) => updateSetting('scan_frequency', 'value', value)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5min">Every 5 minutes</SelectItem>
              <SelectItem value="15min">Every 15 minutes</SelectItem>
              <SelectItem value="hourly">Hourly</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="manual">Manual only</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Auto-Fix Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Auto-Fix Capabilities</CardTitle>
          </div>
          <CardDescription>
            Enable automatic fixes for specific issue types (safe operations only)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Broken Internal Links</Label>
              <p className="text-sm text-muted-foreground">Auto-repair or redirect broken internal links</p>
            </div>
            <Switch
              checked={effectiveSettings.auto_fix_enabled?.broken_links ?? false}
              onCheckedChange={(checked) => updateSetting('auto_fix_enabled', 'broken_links', checked)}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Missing Image Recovery</Label>
              <p className="text-sm text-muted-foreground">Re-link or flag missing media files</p>
            </div>
            <Switch
              checked={effectiveSettings.auto_fix_enabled?.missing_images ?? false}
              onCheckedChange={(checked) => updateSetting('auto_fix_enabled', 'missing_images', checked)}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Cache Cleanup</Label>
              <p className="text-sm text-muted-foreground">Clear stuck or invalid cache entries</p>
            </div>
            <Switch
              checked={effectiveSettings.auto_fix_enabled?.cache_cleanup ?? false}
              onCheckedChange={(checked) => updateSetting('auto_fix_enabled', 'cache_cleanup', checked)}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Webhook Retry</Label>
              <p className="text-sm text-muted-foreground">Re-trigger failed webhook events</p>
            </div>
            <Switch
              checked={effectiveSettings.auto_fix_enabled?.webhook_retry ?? false}
              onCheckedChange={(checked) => updateSetting('auto_fix_enabled', 'webhook_retry', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Alert Thresholds */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Alert Settings</CardTitle>
          </div>
          <CardDescription>
            Configure when and how you receive alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Immediate Critical Alerts</Label>
              <p className="text-sm text-muted-foreground">Alert immediately on critical issues</p>
            </div>
            <Switch
              checked={effectiveSettings.alert_thresholds?.critical_immediate ?? true}
              onCheckedChange={(checked) => updateSetting('alert_thresholds', 'critical_immediate', checked)}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>High Priority Within Hour</Label>
              <p className="text-sm text-muted-foreground">Alert on high issues within 1 hour</p>
            </div>
            <Switch
              checked={effectiveSettings.alert_thresholds?.high_within_hour ?? true}
              onCheckedChange={(checked) => updateSetting('alert_thresholds', 'high_within_hour', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Scope Limitations (Read-only display) */}
      <Card className="border-red-200 dark:border-red-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-red-500" />
            <CardTitle>Scope Limitations</CardTitle>
            <Badge variant="destructive">Protected</Badge>
          </div>
          <CardDescription>
            These actions are NEVER performed automatically by the AI agent
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span>Cannot modify pricing or subscription logic</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span>Cannot approve or reject businesses</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span>Cannot issue refunds</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span>Cannot modify user data or legal content</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      {unsavedChanges && (
        <div className="sticky bottom-4 flex justify-end">
          <Button 
            onClick={handleSave}
            disabled={saveMutation.isPending}
            size="lg"
            className="shadow-lg"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default AIAgentSettings;
