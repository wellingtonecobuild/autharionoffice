import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Save, DollarSign } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ReferralSettings {
  premium_reward: number;
  elite_reward: number;
  eligible_plans: string[];
}

const DEFAULT_SETTINGS: ReferralSettings = {
  premium_reward: 50,
  elite_reward: 100,
  eligible_plans: ["premium", "elite"],
};

export const ReferralCommissionSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [premiumReward, setPremiumReward] = useState<number>(50);
  const [eliteReward, setEliteReward] = useState<number>(100);

  const { data: settings, isLoading } = useQuery({
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
        premium_reward: (value.premium_reward as number) ?? DEFAULT_SETTINGS.premium_reward,
        elite_reward: (value.elite_reward as number) ?? DEFAULT_SETTINGS.elite_reward,
        eligible_plans: (value.eligible_plans as string[]) ?? DEFAULT_SETTINGS.eligible_plans,
      };
    },
  });

  useEffect(() => {
    if (settings) {
      setPremiumReward(settings.premium_reward);
      setEliteReward(settings.elite_reward);
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: ReferralSettings) => {
      const { data: existing } = await supabase
        .from("platform_settings")
        .select("id")
        .eq("key", "referral_settings")
        .maybeSingle();

      const settingsValue = {
        premium_reward: newSettings.premium_reward,
        elite_reward: newSettings.elite_reward,
        eligible_plans: newSettings.eligible_plans,
      };

      if (existing) {
        const { error } = await supabase
          .from("platform_settings")
          .update({ value: settingsValue, updated_at: new Date().toISOString() })
          .eq("key", "referral_settings");
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("platform_settings")
          .insert([{ key: "referral_settings", value: settingsValue }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["referral-settings"] });
      toast({ title: "Commission rates updated", description: "Changes are now live on the referral program." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update settings", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    updateSettingsMutation.mutate({
      premium_reward: premiumReward,
      elite_reward: eliteReward,
      eligible_plans: ["premium", "elite"],
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Commission Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Commission Settings
        </CardTitle>
        <CardDescription>
          Set referral rewards for each plan. Changes apply instantly.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="premium-reward" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            Premium Plan Reward
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">$</span>
            <Input
              id="premium-reward"
              type="number"
              min={0}
              value={premiumReward}
              onChange={(e) => setPremiumReward(Number(e.target.value))}
              className="w-24"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="elite-reward" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-amber-500" />
            Elite Plan Reward
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">$</span>
            <Input
              id="elite-reward"
              type="number"
              min={0}
              value={eliteReward}
              onChange={(e) => setEliteReward(Number(e.target.value))}
              className="w-24"
            />
          </div>
        </div>

        <Button 
          onClick={handleSave} 
          disabled={updateSettingsMutation.isPending}
          className="w-full"
        >
          <Save className="h-4 w-4 mr-2" />
          {updateSettingsMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>

        <p className="text-xs text-muted-foreground">
          Current rates: Premium ${settings?.premium_reward || 50}, Elite ${settings?.elite_reward || 100}
        </p>
      </CardContent>
    </Card>
  );
};
