import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ReferralSettings {
  premium_reward: number;
  elite_reward: number;
  eligible_plans: string[];
  enabled: boolean;
}

const DEFAULT_SETTINGS: ReferralSettings = {
  premium_reward: 50,
  elite_reward: 100,
  eligible_plans: ["premium", "elite"],
  enabled: true,
};

export const useReferralSettings = () => {
  const { data: settings, isLoading, error } = useQuery({
    queryKey: ["referral-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "referral_settings")
        .maybeSingle();

      if (error) throw error;
      if (!data?.value) return DEFAULT_SETTINGS;
      
      const value = data.value as Record<string, unknown>;
      return {
        premium_reward: (value.premium_reward as number) ?? (value.premium_commission as number) ?? DEFAULT_SETTINGS.premium_reward,
        elite_reward: (value.elite_reward as number) ?? (value.elite_commission as number) ?? DEFAULT_SETTINGS.elite_reward,
        eligible_plans: (value.eligible_plans as string[]) ?? DEFAULT_SETTINGS.eligible_plans,
        enabled: (value.enabled as boolean) ?? DEFAULT_SETTINGS.enabled,
      };
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  return {
    settings: settings || DEFAULT_SETTINGS,
    isLoading,
    error,
    premiumReward: settings?.premium_reward ?? DEFAULT_SETTINGS.premium_reward,
    eliteReward: settings?.elite_reward ?? DEFAULT_SETTINGS.elite_reward,
  };
};
