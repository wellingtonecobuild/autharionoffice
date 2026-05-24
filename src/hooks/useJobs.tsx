import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type JobType = 'full_time' | 'part_time' | 'contract';
export type JobStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'closed';

export interface Job {
  id: string;
  business_id: string;
  title: string;
  location: string;
  job_type: JobType;
  summary: string;
  responsibilities: string;
  requirements: string;
  sustainability_relevance: string | null;
  application_method: string;
  application_email: string | null;
  application_url: string | null;
  expires_at: string;
  status: JobStatus;
  is_featured: boolean;
  featured_until: string | null;
  is_spotlight: boolean;
  spotlight_until: string | null;
  is_paid_listing: boolean;
  paid_listing_expires_at: string | null;
  admin_notes: string | null;
  rejection_reason: string | null;
  views: number;
  clicks: number;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  approved_by: string | null;
  // New salary fields
  salary_min: number | null;
  salary_max: number | null;
  salary_type: string | null;
  category: string | null;
  applications_count: number;
}

export interface JobWithBusiness extends Job {
  business: {
    id: string;
    name: string;
    category: string;
    city: string;
    is_verified: boolean;
    subscription_plan: string;
  };
}

export interface JobSettings {
  enabled: boolean;
  premium_job_limit: number;
  elite_job_limit: number;
  featured_price_per_week: number;
  featured_duration_days: number;
  spotlight_duration_days: number;
  pay_per_listing_price: number;
  spotlight_price_per_week: number;
}

export function useJobs() {
  const [jobs, setJobs] = useState<JobWithBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = async (filters?: { category?: string; jobType?: string; location?: string }) => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('jobs')
        .select(`
          *,
          business:businesses(id, name, category, city, is_verified, subscription_plan)
        `)
        .eq('status', 'approved')
        .gt('expires_at', new Date().toISOString())
        // Order: Spotlight first, then featured, then by Elite subscription, then by date
        .order('is_spotlight', { ascending: false })
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });

      if (filters?.jobType) {
        query = query.eq('job_type', filters.jobType as 'full_time' | 'part_time' | 'contract');
      }
      if (filters?.location) {
        query = query.ilike('location', `%${filters.location}%`);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;
      
      // Filter out jobs without a business (shouldn't happen but safety check)
      // and apply category filter client-side since we can't use !inner
      let filteredJobs = (data || []).filter((job: any) => job.business !== null);
      
      if (filters?.category) {
        filteredJobs = filteredJobs.filter((job: any) => job.business?.category === filters.category);
      }
      
      setJobs(filteredJobs as JobWithBusiness[]);
    } catch (err: any) {
      console.error('Error fetching jobs:', err);
      setError(err.message);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  // Real-time subscription for jobs
  useEffect(() => {
    const channel = supabase
      .channel('jobs-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs'
        },
        () => {
          fetchJobs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { jobs, loading, error, fetchJobs };
}

export function useJobSettings() {
  const [settings, setSettings] = useState<JobSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase
          .from('platform_settings')
          .select('value')
          .eq('key', 'job_settings')
          .maybeSingle();

        if (data?.value) {
          setSettings(data.value as unknown as JobSettings);
        }
      } catch (err) {
        console.error('Error fetching job settings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return { settings, loading };
}

export function useBusinessJobs(businessId: string | undefined) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBusinessJobs = async () => {
    if (!businessId) return;
    
    setLoading(true);
    try {
      const { data } = await supabase
        .from('jobs')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      setJobs((data as Job[]) || []);
    } catch (err) {
      console.error('Error fetching business jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinessJobs();
  }, [businessId]);

  return { jobs, loading, refetch: fetchBusinessJobs };
}

export function useUserJobCount(userId: string | undefined) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      if (!userId) return;

      try {
        // Get user's businesses
        const { data: businesses } = await supabase
          .from('businesses')
          .select('id, subscription_plan')
          .eq('owner_id', userId);

        if (!businesses) return;

        // Get active job counts per business
        const jobCounts: Record<string, number> = {};
        for (const business of businesses) {
          const { count } = await supabase
            .from('jobs')
            .select('*', { count: 'exact', head: true })
            .eq('business_id', business.id)
            .in('status', ['pending', 'approved'])
            .gt('expires_at', new Date().toISOString());

          jobCounts[business.id] = count || 0;
        }

        setCounts(jobCounts);
      } catch (err) {
        console.error('Error fetching job counts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();
  }, [userId]);

  return { counts, loading };
}
