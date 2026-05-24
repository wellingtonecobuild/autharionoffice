import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EliteCategoryCap {
  id: string;
  category: string;
  max_slots: number;
  current_count: number;
  is_accepting_new: boolean;
  updated_at: string;
  updated_by: string | null;
}

export interface EliteWaitlistEntry {
  id: string;
  business_id: string;
  category: string;
  current_plan: string;
  requested_at: string;
  notified_at: string | null;
  status: string;
  admin_notes: string | null;
  processed_by: string | null;
  processed_at: string | null;
  priority_score: number;
  is_verified: boolean;
  review_count: number;
  average_rating: number;
  months_on_platform: number;
  activity_score: number;
  business?: {
    id: string;
    name: string;
    owner_id: string;
    email: string;
  };
}

export interface EliteRegionSettings {
  id: string;
  region_name: string;
  base_cap: number;
  current_cap: number;
  traffic_threshold_1: number;
  traffic_threshold_2: number;
  traffic_threshold_3: number;
  cap_at_threshold_1: number;
  cap_at_threshold_2: number;
  cap_at_threshold_3: number;
  current_monthly_traffic: number;
  last_traffic_update: string | null;
  is_rotation_enabled: boolean;
  rotation_frequency: string;
  updated_at: string;
  updated_by: string | null;
}

export interface EliteLocationMultiplier {
  id: string;
  city: string;
  suburb: string | null;
  size_tier: 'small' | 'medium' | 'large';
  slot_multiplier: number;
  max_elite_slots: number;
  current_elite_count: number;
  created_at: string;
  updated_at: string;
}

export interface EliteRotationEntry {
  id: string;
  business_id: string;
  category: string;
  rotation_date: string;
  display_order: number;
  impressions_today: number;
  clicks_today: number;
  created_at: string;
}

// ============ Category Caps ============
export const useEliteAvailability = () => {
  return useQuery({
    queryKey: ["elite-category-caps"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("elite_category_caps")
        .select("*")
        .order("category");

      if (error) throw error;
      return data as EliteCategoryCap[];
    },
    staleTime: 30000,
  });
};

export const useEliteAvailabilityByCategory = (category: string) => {
  const { data: allCaps, isLoading } = useEliteAvailability();
  
  const cap = allCaps?.find(c => c.category === category);
  
  return {
    isAvailable: cap ? cap.current_count < cap.max_slots && cap.is_accepting_new : false,
    currentCount: cap?.current_count ?? 0,
    maxSlots: cap?.max_slots ?? 10,
    slotsRemaining: cap ? Math.max(0, cap.max_slots - cap.current_count) : 0,
    isAcceptingNew: cap?.is_accepting_new ?? false,
    isLoading,
  };
};

// ============ Region Settings ============
export const useEliteRegionSettings = () => {
  return useQuery({
    queryKey: ["elite-region-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("elite_region_settings")
        .select("*")
        .single();

      if (error) throw error;
      return data as EliteRegionSettings;
    },
    staleTime: 60000,
  });
};

// ============ Location Multipliers ============
export const useEliteLocationMultipliers = () => {
  return useQuery({
    queryKey: ["elite-location-multipliers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("elite_location_multipliers")
        .select("*")
        .order("city")
        .order("suburb");

      if (error) throw error;
      return data as EliteLocationMultiplier[];
    },
    staleTime: 60000,
  });
};

export const useEliteAvailabilityByLocation = (city: string, suburb?: string | null) => {
  const { data: multipliers, isLoading } = useEliteLocationMultipliers();
  
  // Try exact match first, then city-level fallback
  const multiplier = multipliers?.find(
    m => m.city === city && m.suburb === suburb
  ) || multipliers?.find(
    m => m.city === city && m.suburb === null
  );
  
  return {
    isAvailable: multiplier 
      ? multiplier.current_elite_count < multiplier.max_elite_slots 
      : true,
    currentCount: multiplier?.current_elite_count ?? 0,
    maxSlots: multiplier?.max_elite_slots ?? 10,
    slotsRemaining: multiplier 
      ? Math.max(0, multiplier.max_elite_slots - multiplier.current_elite_count) 
      : 10,
    sizeTier: multiplier?.size_tier ?? 'medium',
    isLoading,
  };
};

// ============ Waitlist with Priority ============
export const useEliteWaitlist = () => {
  return useQuery({
    queryKey: ["elite-waitlist"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("elite_waitlist")
        .select(`
          *,
          business:businesses(id, name, owner_id, email)
        `)
        .order("priority_score", { ascending: false })
        .order("requested_at", { ascending: true });

      if (error) throw error;
      return data as EliteWaitlistEntry[];
    },
  });
};

export const useJoinEliteWaitlist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      businessId, 
      category, 
      currentPlan,
      isVerified = false,
      reviewCount = 0,
      averageRating = 0,
    }: { 
      businessId: string; 
      category: string; 
      currentPlan: string;
      isVerified?: boolean;
      reviewCount?: number;
      averageRating?: number;
    }) => {
      // Calculate months on platform from business creation date
      const { data: business } = await supabase
        .from("businesses")
        .select("created_at, is_verified, review_count, rating")
        .eq("id", businessId)
        .single();
      
      const monthsOnPlatform = business 
        ? Math.floor((Date.now() - new Date(business.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30))
        : 0;

      const { data, error } = await supabase
        .from("elite_waitlist")
        .insert({
          business_id: businessId,
          category,
          current_plan: currentPlan,
          is_verified: business?.is_verified ?? isVerified,
          review_count: business?.review_count ?? reviewCount,
          average_rating: business?.rating ?? averageRating,
          months_on_platform: monthsOnPlatform,
          activity_score: 0, // Could be calculated from leads, responses, etc.
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new Error("You are already on the waitlist");
        }
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["elite-waitlist"] });
      toast.success("You've been added to the Elite waitlist!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

// ============ Rotation Log ============
export const useEliteRotation = (category?: string) => {
  return useQuery({
    queryKey: ["elite-rotation", category],
    queryFn: async () => {
      let query = supabase
        .from("elite_rotation_log")
        .select("*")
        .eq("rotation_date", new Date().toISOString().split('T')[0])
        .order("display_order");
      
      if (category) {
        query = query.eq("category", category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EliteRotationEntry[];
    },
    staleTime: 60000,
  });
};

// ============ Admin Management ============
export const useAdminEliteManagement = () => {
  const queryClient = useQueryClient();

  const updateCap = useMutation({
    mutationFn: async ({ 
      category, 
      maxSlots, 
      isAcceptingNew 
    }: { 
      category: string; 
      maxSlots?: number; 
      isAcceptingNew?: boolean;
    }) => {
      const updates: Partial<EliteCategoryCap> = {};
      if (maxSlots !== undefined) updates.max_slots = maxSlots;
      if (isAcceptingNew !== undefined) updates.is_accepting_new = isAcceptingNew;

      const { data, error } = await supabase
        .from("elite_category_caps")
        .update(updates)
        .eq("category", category)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["elite-category-caps"] });
      toast.success("Elite cap updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateRegionSettings = useMutation({
    mutationFn: async (updates: Partial<EliteRegionSettings>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("elite_region_settings")
        .update({
          ...updates,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq("region_name", "wellington")
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["elite-region-settings"] });
      toast.success("Region settings updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateLocationMultiplier = useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string; 
      updates: Partial<EliteLocationMultiplier>;
    }) => {
      const { data, error } = await supabase
        .from("elite_location_multipliers")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["elite-location-multipliers"] });
      toast.success("Location settings updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const addLocationMultiplier = useMutation({
    mutationFn: async (data: {
      city: string;
      suburb?: string | null;
      size_tier: 'small' | 'medium' | 'large';
      max_elite_slots: number;
    }) => {
      const slotMultiplier = data.size_tier === 'large' ? 2.0 : data.size_tier === 'small' ? 0.5 : 1.0;
      
      const { data: result, error } = await supabase
        .from("elite_location_multipliers")
        .insert({
          ...data,
          slot_multiplier: slotMultiplier,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["elite-location-multipliers"] });
      toast.success("Location added");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const processWaitlistEntry = useMutation({
    mutationFn: async ({ 
      entryId, 
      action,
      adminNotes,
    }: { 
      entryId: string; 
      action: "approved" | "rejected";
      adminNotes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("elite_waitlist")
        .update({
          status: action,
          admin_notes: adminNotes,
          processed_by: user?.id,
          processed_at: new Date().toISOString(),
          notified_at: new Date().toISOString(),
        })
        .eq("id", entryId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["elite-waitlist"] });
      toast.success(`Waitlist entry ${variables.action}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const removeFromWaitlist = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from("elite_waitlist")
        .delete()
        .eq("id", entryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["elite-waitlist"] });
      toast.success("Removed from waitlist");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateTraffic = useMutation({
    mutationFn: async (monthlyTraffic: number) => {
      const { data, error } = await supabase
        .from("elite_region_settings")
        .update({
          current_monthly_traffic: monthlyTraffic,
          last_traffic_update: new Date().toISOString(),
        })
        .eq("region_name", "wellington")
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["elite-region-settings"] });
      toast.success("Traffic updated - cap adjusted automatically");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    updateCap,
    updateRegionSettings,
    updateLocationMultiplier,
    addLocationMultiplier,
    processWaitlistEntry,
    removeFromWaitlist,
    updateTraffic,
  };
};

// ============ Total Elite Stats ============
export const useEliteTotalStats = () => {
  const { data: caps } = useEliteAvailability();
  const { data: regionSettings } = useEliteRegionSettings();
  const { data: waitlist } = useEliteWaitlist();
  
  const totalUsed = caps?.reduce((sum, c) => sum + c.current_count, 0) ?? 0;
  const categoryCapTotal = caps?.reduce((sum, c) => sum + c.max_slots, 0) ?? 0;
  const regionCap = regionSettings?.current_cap ?? 100;
  const waitingCount = waitlist?.filter(w => w.status === "waiting").length ?? 0;
  
  return {
    totalUsed,
    categoryCapTotal,
    regionCap,
    effectiveCap: Math.min(categoryCapTotal, regionCap),
    waitingCount,
    isNearingCap: totalUsed >= regionCap * 0.8,
    isAtCap: totalUsed >= regionCap,
    monthlyRevenue: totalUsed * 399,
    maxMonthlyRevenue: Math.min(categoryCapTotal, regionCap) * 399,
  };
};

// Utility to format category name
export const formatCategoryName = (category: string): string => {
  return category
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const formatSizeTier = (tier: string): string => {
  const colors: Record<string, string> = {
    small: 'text-yellow-600',
    medium: 'text-blue-600',
    large: 'text-green-600',
  };
  return colors[tier] || 'text-muted-foreground';
};
