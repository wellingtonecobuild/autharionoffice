import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type BusinessPublic = Database['public']['Tables']['businesses_public']['Row'];

export interface MapBusiness extends BusinessPublic {
  latitude: number | null;
  longitude: number | null;
  map_visible: boolean;
  pin_priority: 'normal' | 'featured' | 'spotlight';
  // Website is available in businesses_public
  website: string | null;
  address: string | null;
}

interface UseMapBusinessesFilters {
  category?: string;
  subCategory?: string;
  city?: string;
  verifiedOnly?: boolean;
  subscriptionTier?: 'all' | 'premium' | 'elite';
}

export function useMapBusinesses(filters: UseMapBusinessesFilters = {}) {
  const [businesses, setBusinesses] = useState<MapBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBusinesses = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Use the public view which excludes sensitive columns (email, phone, stripe IDs)
      // Include all map-visible businesses - those with coordinates will show as pins
      let query = supabase
        .from('businesses_public')
        .select('*')
        .eq('map_visible', true);

      // Apply filters
      if (filters.category) {
        query = query.eq('category', filters.category as Database['public']['Enums']['business_category']);
      }

      if (filters.city) {
        query = query.eq('city', filters.city);
      }

      if (filters.verifiedOnly) {
        query = query.eq('is_verified', true);
      }

      if (filters.subscriptionTier && filters.subscriptionTier !== 'all') {
        if (filters.subscriptionTier === 'elite') {
          query = query.eq('subscription_plan', 'elite');
        } else if (filters.subscriptionTier === 'premium') {
          query = query.in('subscription_plan', ['premium', 'elite']);
        }
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Sort by pin priority (spotlight first, then featured, then normal)
      const sortedData = (data as MapBusiness[] || []).sort((a, b) => {
        const priorityOrder = { spotlight: 0, featured: 1, normal: 2 };
        return priorityOrder[a.pin_priority] - priorityOrder[b.pin_priority];
      });

      // Filter by sub-category if specified
      let filteredData = sortedData;
      if (filters.subCategory) {
        filteredData = sortedData.filter(b => 
          b.sub_categories?.includes(filters.subCategory!)
        );
      }

      setBusinesses(filteredData);
    } catch (err) {
      console.error('Error fetching map businesses:', err);
      setError(err instanceof Error ? err.message : 'Failed to load businesses');
    } finally {
      setLoading(false);
    }
  }, [filters.category, filters.subCategory, filters.city, filters.verifiedOnly, filters.subscriptionTier]);

  // Initial fetch
  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  // Real-time subscription for live updates
  useEffect(() => {
    const channel = supabase
      .channel('map-businesses-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'businesses',
        },
        (payload) => {
          console.log('Real-time update:', payload);
          // Refetch on any change to businesses table
          fetchBusinesses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBusinesses]);

  return { businesses, loading, error, refetch: fetchBusinesses };
}
