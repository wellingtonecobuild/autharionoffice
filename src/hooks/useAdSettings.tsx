import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AdSettings {
  ads_enabled_globally: boolean;
  ad_frequency_paragraphs: number;
  adsense_publisher_id: string;
}

const defaultAdSettings: AdSettings = {
  ads_enabled_globally: true,
  ad_frequency_paragraphs: 5,
  adsense_publisher_id: '',
};

export function useAdSettings() {
  const [settings, setSettings] = useState<AdSettings>(defaultAdSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('key, value')
        .in('key', ['ads_enabled_globally', 'ad_frequency_paragraphs', 'adsense_publisher_id']);

      if (error) throw error;

      const newSettings = { ...defaultAdSettings };
      data?.forEach((row) => {
        if (row.key === 'ads_enabled_globally') newSettings.ads_enabled_globally = row.value as boolean;
        if (row.key === 'ad_frequency_paragraphs') newSettings.ad_frequency_paragraphs = row.value as number;
        if (row.key === 'adsense_publisher_id') newSettings.adsense_publisher_id = (row.value as string) || '';
      });

      setSettings(newSettings);
    } catch (error) {
      console.error('Error fetching ad settings:', error);
    } finally {
      setLoading(false);
    }
  };

  return { settings, loading };
}
