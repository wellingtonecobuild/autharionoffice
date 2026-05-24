import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PlatformSettings {
  allow_new_listings: boolean;
  allow_upgrades: boolean;
  maintenance_mode: boolean;
  max_businesses_per_category: number | null;
  spotlight_rotation_speed: number;
  // Display settings
  show_live_stats_count: boolean;
  // Ad settings
  ads_enabled_globally: boolean;
  ad_frequency_paragraphs: number;
  adsense_publisher_id: string;
  // Email notification settings
  email_notify_listing_approval: boolean;
  email_notify_new_lead: boolean;
  email_notify_job_application: boolean;
  // Review settings
  reviews_auto_publish: boolean;
  // Pricing settings (NZD)
  price_premium_monthly: number;
  price_elite_monthly: number;
  price_spotlight_weekly: number;
  // Stripe price IDs
  stripe_price_id_premium: string;
  stripe_price_id_elite: string;
}

const defaultSettings: PlatformSettings = {
  allow_new_listings: true,
  allow_upgrades: true,
  maintenance_mode: false,
  max_businesses_per_category: null,
  spotlight_rotation_speed: 5000,
  // Display settings
  show_live_stats_count: true,
  // Ad settings
  ads_enabled_globally: true,
  ad_frequency_paragraphs: 5,
  adsense_publisher_id: '',
  // Email notification settings
  email_notify_listing_approval: true,
  email_notify_new_lead: true,
  email_notify_job_application: true,
  // Review settings
  reviews_auto_publish: false,
  // Pricing settings (NZD)
  price_premium_monthly: 149,
  price_elite_monthly: 299,
  price_spotlight_weekly: 99,
  // Stripe price IDs
  stripe_price_id_premium: '',
  stripe_price_id_elite: '',
};

export function usePlatformSettings() {
  const [settings, setSettings] = useState<PlatformSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('key, value');

      if (error) throw error;

      const newSettings = { ...defaultSettings };
      data?.forEach((row) => {
        const key = row.key;
        if (key === 'allow_new_listings') newSettings.allow_new_listings = row.value as boolean;
        if (key === 'allow_upgrades') newSettings.allow_upgrades = row.value as boolean;
        if (key === 'maintenance_mode') newSettings.maintenance_mode = row.value as boolean;
        if (key === 'max_businesses_per_category') newSettings.max_businesses_per_category = row.value as number | null;
        if (key === 'spotlight_rotation_speed') newSettings.spotlight_rotation_speed = row.value as number;
        // Display settings
        if (key === 'show_live_stats_count') newSettings.show_live_stats_count = row.value as boolean;
        // Ad settings
        if (key === 'ads_enabled_globally') newSettings.ads_enabled_globally = row.value as boolean;
        if (key === 'ad_frequency_paragraphs') newSettings.ad_frequency_paragraphs = row.value as number;
        if (key === 'adsense_publisher_id') newSettings.adsense_publisher_id = (row.value as string) || '';
        // Email notification settings
        if (key === 'email_notify_listing_approval') newSettings.email_notify_listing_approval = row.value as boolean;
        if (key === 'email_notify_new_lead') newSettings.email_notify_new_lead = row.value as boolean;
        if (key === 'email_notify_job_application') newSettings.email_notify_job_application = row.value as boolean;
        // Review settings
        if (key === 'reviews_auto_publish') newSettings.reviews_auto_publish = row.value as boolean;
        // Pricing settings
        if (key === 'price_premium_monthly') newSettings.price_premium_monthly = row.value as number;
        if (key === 'price_elite_monthly') newSettings.price_elite_monthly = row.value as number;
        if (key === 'price_spotlight_weekly') newSettings.price_spotlight_weekly = row.value as number;
        // Stripe price IDs
        if (key === 'stripe_price_id_premium') newSettings.stripe_price_id_premium = (row.value as string) || '';
        if (key === 'stripe_price_id_elite') newSettings.stripe_price_id_elite = (row.value as string) || '';
      });

      setSettings(newSettings);
    } catch (error) {
      console.error('Error fetching platform settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof PlatformSettings, value: any) => {
    try {
      // Check if setting exists
      const { data: existing } = await supabase
        .from('platform_settings')
        .select('id')
        .eq('key', key)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('platform_settings')
          .update({ value })
          .eq('key', key);
      } else {
        await supabase
          .from('platform_settings')
          .insert({ key, value });
      }

      setSettings((prev) => ({ ...prev, [key]: value }));
      return true;
    } catch (error) {
      console.error('Error updating setting:', error);
      return false;
    }
  };

  return { settings, loading, updateSetting, refetch: fetchSettings };
}
