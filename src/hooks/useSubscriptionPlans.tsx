import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FeatureToggle {
  show_phone: boolean;
  show_email: boolean;
  show_website: boolean;
  show_verified_badge: boolean;
  show_reviews: boolean;
  priority_placement: boolean;
  job_postings: number; // -1 for unlimited
  spotlight_jobs?: boolean;
  top_tier_placement?: boolean;
  featured_badge?: boolean;
  analytics?: boolean;
  priority_support?: boolean;
}

export interface PlanFeature {
  text: string;
  included: boolean;
}

export interface SubscriptionPlan {
  id: string;
  plan_key: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_annual: number | null;
  gst_included: boolean;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
  stripe_price_id_annual: string | null;
  stripe_product_id_annual: string | null;
  features: PlanFeature[];
  feature_toggles: Partial<FeatureToggle>;
  visibility_rules: Record<string, any>;
  status: 'active' | 'hidden' | 'archived' | 'paused';
  sort_order: number;
  is_popular: boolean;
  scarcity_label: string | null;
  scarcity_count: number | null;
  max_subscribers: number | null;
  badge_text: string | null;
  badge_color: string | null;
  cta_text: string;
  icon: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface PlanChangeLog {
  id: string;
  plan_id: string | null;
  action: string;
  field_changed: string | null;
  old_value: any;
  new_value: any;
  admin_id: string;
  created_at: string;
  ip_address: string | null;
  notes: string | null;
}

export function useSubscriptionPlans() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = useCallback(async (includeAll = false) => {
    try {
      setLoading(true);
      let query = supabase
        .from('subscription_plans')
        .select('*')
        .order('sort_order', { ascending: true });
      
      // For admin, fetch all plans
      // For public, only active plans are returned due to RLS
      
      const { data, error: fetchError } = await query;
      
      if (fetchError) throw fetchError;
      
      // Transform data to ensure proper typing
      const transformedPlans = (data || []).map(plan => ({
        ...plan,
        features: (plan.features as unknown as PlanFeature[]) || [],
        feature_toggles: (plan.feature_toggles as unknown as FeatureToggle) || {},
        visibility_rules: (plan.visibility_rules as Record<string, any>) || {},
      })) as SubscriptionPlan[];
      
      setPlans(transformedPlans);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching subscription plans:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();

    // Subscribe to real-time updates on subscription_plans table
    const channel = supabase
      .channel('subscription-plans-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'subscription_plans',
        },
        (payload) => {
          console.log('[useSubscriptionPlans] Real-time update received:', payload.eventType);
          // Refetch plans on any change
          fetchPlans();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPlans]);

  const getPlanByKey = (key: string) => plans.find(p => p.plan_key === key);
  
  const getActivePlans = () => plans.filter(p => p.status === 'active');
  
  const getPlanFeatureToggles = (planKey: string): Partial<FeatureToggle> | null => {
    const plan = getPlanByKey(planKey);
    return plan?.feature_toggles || null;
  };

  return {
    plans,
    loading,
    error,
    refetch: fetchPlans,
    getPlanByKey,
    getActivePlans,
    getPlanFeatureToggles,
  };
}

export function useAdminSubscriptionPlans() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [changeLogs, setChangeLogs] = useState<PlanChangeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      
      const transformedPlans = (data || []).map(plan => ({
        ...plan,
        features: (plan.features as unknown as PlanFeature[]) || [],
        feature_toggles: (plan.feature_toggles as unknown as FeatureToggle) || {},
        visibility_rules: (plan.visibility_rules as Record<string, any>) || {},
      })) as SubscriptionPlan[];
      
      setPlans(transformedPlans);
    } catch (err) {
      console.error('Error fetching plans:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchChangeLogs = useCallback(async (planId?: string) => {
    try {
      let query = supabase
        .from('plan_change_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (planId) {
        query = query.eq('plan_id', planId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      setChangeLogs(data || []);
    } catch (err) {
      console.error('Error fetching change logs:', err);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
    fetchChangeLogs();
  }, [fetchPlans, fetchChangeLogs]);

  const logChange = async (
    planId: string | null,
    action: string,
    fieldChanged?: string,
    oldValue?: any,
    newValue?: any,
    notes?: string
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('plan_change_logs').insert({
      plan_id: planId,
      action,
      field_changed: fieldChanged || null,
      old_value: oldValue ? JSON.stringify(oldValue) : null,
      new_value: newValue ? JSON.stringify(newValue) : null,
      admin_id: user.id,
      notes,
    });
  };

  const createPlan = async (planData: Partial<SubscriptionPlan>) => {
    setSaving(true);
    try {
      const insertData = {
        plan_key: planData.plan_key,
        name: planData.name,
        description: planData.description,
        price_monthly: planData.price_monthly || 0,
        gst_included: planData.gst_included ?? true,
        stripe_price_id: planData.stripe_price_id,
        stripe_product_id: planData.stripe_product_id,
        features: JSON.parse(JSON.stringify(planData.features || [])),
        feature_toggles: JSON.parse(JSON.stringify(planData.feature_toggles || {})),
        visibility_rules: JSON.parse(JSON.stringify(planData.visibility_rules || {})),
        status: planData.status || 'active',
        sort_order: planData.sort_order || 0,
        is_popular: planData.is_popular || false,
        scarcity_label: planData.scarcity_label,
        scarcity_count: planData.scarcity_count,
        max_subscribers: planData.max_subscribers,
        badge_text: planData.badge_text,
        badge_color: planData.badge_color,
        cta_text: planData.cta_text || 'Apply Now',
        icon: planData.icon || 'zap',
      };
      
      const { data, error } = await supabase
        .from('subscription_plans')
        .insert(insertData as any)
        .select()
        .single();
      
      if (error) throw error;
      
      await logChange(data.id, 'create', null, null, planData, 'Plan created');
      await fetchPlans();
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      setSaving(false);
    }
  };

  const updatePlan = async (id: string, updates: Partial<SubscriptionPlan>) => {
    setSaving(true);
    try {
      // Get current plan for logging
      const currentPlan = plans.find(p => p.id === id);
      
      // Prepare update data with proper JSON serialization
      const updateData: any = {
        ...updates,
        updated_at: new Date().toISOString(),
      };
      if (updates.features) updateData.features = JSON.parse(JSON.stringify(updates.features));
      if (updates.feature_toggles) updateData.feature_toggles = JSON.parse(JSON.stringify(updates.feature_toggles));
      if (updates.visibility_rules) updateData.visibility_rules = JSON.parse(JSON.stringify(updates.visibility_rules));
      
      const { error } = await supabase
        .from('subscription_plans')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
      
      // Log all changed fields
      for (const [key, value] of Object.entries(updates)) {
        if (currentPlan && currentPlan[key as keyof SubscriptionPlan] !== value) {
          await logChange(
            id,
            'update',
            key,
            currentPlan[key as keyof SubscriptionPlan],
            value
          );
        }
      }
      
      await fetchPlans();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      setSaving(false);
    }
  };

  const updatePlanStatus = async (id: string, status: SubscriptionPlan['status']) => {
    const currentPlan = plans.find(p => p.id === id);
    const result = await updatePlan(id, { status });
    if (result.success) {
      await logChange(id, status === 'archived' ? 'archive' : status === 'paused' ? 'pause' : 'activate', 
        'status', currentPlan?.status, status);
    }
    return result;
  };

  const deletePlan = async (id: string) => {
    setSaving(true);
    try {
      const plan = plans.find(p => p.id === id);
      
      // Instead of deleting, archive it
      const { error } = await supabase
        .from('subscription_plans')
        .update({ status: 'archived' })
        .eq('id', id);
      
      if (error) throw error;
      
      await logChange(id, 'archive', 'status', plan?.status, 'archived', 'Plan archived (safe delete)');
      await fetchPlans();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      setSaving(false);
    }
  };

  const syncPriceToStripe = async (planId: string, priceNZD: number) => {
    try {
      const plan = plans.find(p => p.id === planId);
      if (!plan) throw new Error('Plan not found');

      const { data, error } = await supabase.functions.invoke('update-stripe-prices', {
        body: {
          action: 'update',
          plan: plan.plan_key,
          priceNZD,
        }
      });

      if (error) throw error;

      // Update plan with new Stripe price ID
      await updatePlan(planId, {
        price_monthly: priceNZD,
        stripe_price_id: data?.newPriceId,
      });

      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const clearAllChangeLogs = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('plan_change_logs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) throw error;
      
      setChangeLogs([]);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      setSaving(false);
    }
  };

  const deleteChangeLog = async (logId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('plan_change_logs')
        .delete()
        .eq('id', logId);

      if (error) throw error;
      
      await fetchChangeLogs();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      setSaving(false);
    }
  };

  return {
    plans,
    changeLogs,
    loading,
    saving,
    refetch: fetchPlans,
    fetchChangeLogs,
    createPlan,
    updatePlan,
    updatePlanStatus,
    deletePlan,
    syncPriceToStripe,
    clearAllChangeLogs,
    deleteChangeLog,
  };
}