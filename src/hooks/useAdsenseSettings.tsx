import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AdPlacementPositions {
  after_first_paragraph: boolean;
  mid_article: boolean;
  end_of_article: boolean;
  sidebar: boolean;
}

export interface AdsenseSettings {
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

export function useAdsenseSettings() {
  const [settings, setSettings] = useState<AdsenseSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
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

      const newSettings = { ...defaultSettings };
      data?.forEach((row) => {
        if (row.key === 'adsense_enabled') newSettings.adsense_enabled = row.value as boolean;
        if (row.key === 'adsense_publisher_id') newSettings.adsense_publisher_id = (row.value as string) || '';
        if (row.key === 'adsense_auto_ads_code') newSettings.adsense_auto_ads_code = (row.value as string) || '';
        if (row.key === 'adsense_ad_positions') newSettings.adsense_ad_positions = row.value as unknown as AdPlacementPositions;
        if (row.key === 'adsense_max_ads_per_page') newSettings.adsense_max_ads_per_page = row.value as number;
        if (row.key === 'adsense_connection_status') newSettings.adsense_connection_status = row.value as 'connected' | 'not_connected' | 'error';
        if (row.key === 'ads_enabled_globally') newSettings.ads_enabled_globally = row.value as boolean;
        if (row.key === 'ad_frequency_paragraphs') newSettings.ad_frequency_paragraphs = row.value as number;
      });

      setSettings(newSettings);
    } catch (error) {
      console.error('Error fetching adsense settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check if ads should be shown for a specific article
  const shouldShowAds = (articleAdsEnabled?: boolean) => {
    // Master switch must be on
    if (!settings.adsense_enabled) return false;
    // Global ads must be enabled
    if (!settings.ads_enabled_globally) return false;
    // Publisher ID must be set
    if (!settings.adsense_publisher_id) return false;
    // Article-level override (if provided)
    if (articleAdsEnabled === false) return false;
    return true;
  };

  // Check if a specific position should show an ad
  const shouldShowAdAtPosition = (position: keyof AdPlacementPositions) => {
    return settings.adsense_ad_positions[position];
  };

  return { 
    settings, 
    loading, 
    shouldShowAds, 
    shouldShowAdAtPosition,
    refetch: fetchSettings 
  };
}
