import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ABTestVariant {
  position: string;
  format: string;
}

interface ActiveTest {
  id: string;
  variant: 'A' | 'B';
  config: ABTestVariant;
}

export function useABTest() {
  const [assignedTests, setAssignedTests] = useState<Map<string, 'A' | 'B'>>(new Map());

  // Fetch running A/B tests
  const { data: runningTests } = useQuery({
    queryKey: ['running-ab-tests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_ab_tests')
        .select('id, variant_a, variant_b, traffic_split')
        .eq('status', 'running');
      if (error) throw error;
      return data;
    },
    staleTime: 60000, // Cache for 1 minute
  });

  // Get or assign variant for a test
  const getVariant = (testId: string, trafficSplit: number): 'A' | 'B' => {
    // Check if already assigned in this session
    const existing = assignedTests.get(testId);
    if (existing) return existing;

    // Check localStorage for persistence
    const storedKey = `ab_test_${testId}`;
    const stored = localStorage.getItem(storedKey);
    if (stored === 'A' || stored === 'B') {
      setAssignedTests(prev => new Map(prev).set(testId, stored));
      return stored;
    }

    // Assign new variant based on traffic split
    const variant: 'A' | 'B' = Math.random() * 100 < trafficSplit ? 'A' : 'B';
    localStorage.setItem(storedKey, variant);
    setAssignedTests(prev => new Map(prev).set(testId, variant));
    return variant;
  };

  // Get active test for a specific position
  const getActiveTestForPosition = (position: string): ActiveTest | null => {
    if (!runningTests || runningTests.length === 0) return null;

    for (const test of runningTests) {
      const variantA = test.variant_a as unknown as ABTestVariant;
      const variantB = test.variant_b as unknown as ABTestVariant;
      
      // Check if this test affects the requested position
      if (variantA.position === position || variantB.position === position) {
        const assigned = getVariant(test.id, test.traffic_split);
        const config = assigned === 'A' ? variantA : variantB;
        
        // Only return if the assigned variant matches this position
        if (config.position === position) {
          return {
            id: test.id,
            variant: assigned,
            config,
          };
        }
      }
    }

    return null;
  };

  // Track impression
  const trackImpression = async (testId: string, variant: 'A' | 'B') => {
    try {
      await supabase.functions.invoke('track-ab-impression', {
        body: { test_id: testId, variant, event_type: 'impression' },
      });
    } catch (error) {
      console.error('Failed to track impression:', error);
    }
  };

  // Track click
  const trackClick = async (testId: string, variant: 'A' | 'B') => {
    try {
      await supabase.functions.invoke('track-ab-impression', {
        body: { test_id: testId, variant, event_type: 'click' },
      });
    } catch (error) {
      console.error('Failed to track click:', error);
    }
  };

  return {
    runningTests,
    getActiveTestForPosition,
    trackImpression,
    trackClick,
  };
}
