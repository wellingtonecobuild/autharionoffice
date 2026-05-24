import { useEffect, useState, useCallback } from 'react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Star, StarOff, Loader2 } from 'lucide-react';

interface Business {
  id: string;
  name: string;
  category: string;
  city: string;
  subscription_plan: string;
  is_featured: boolean;
  is_verified: boolean;
}

export default function AdminFeatured() {
  const { toast } = useToast();
  const [featuredBusinesses, setFeaturedBusinesses] = useState<Business[]>([]);
  const [eligibleBusinesses, setEligibleBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  // Auto-refresh every 5 seconds
  useAutoRefresh(useCallback(() => fetchBusinesses(), []));

  useEffect(() => {
    fetchBusinesses();
  }, []);

  async function fetchBusinesses() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      
      const businesses = data || [];
      setFeaturedBusinesses(businesses.filter(b => b.is_featured));
      setEligibleBusinesses(businesses.filter(b => 
        !b.is_featured && b.subscription_plan === 'elite'
      ));
    } catch (error) {
      console.error('Error fetching businesses:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleFeatured(business: Business) {
    try {
      const { error } = await supabase
        .from('businesses')
        .update({ is_featured: !business.is_featured })
        .eq('id', business.id);

      if (error) throw error;
      toast({ title: 'Success', description: `${business.name} ${business.is_featured ? 'removed from' : 'added to'} featured` });
      fetchBusinesses();
    } catch (error) {
      console.error('Error toggling featured:', error);
      toast({ title: 'Error', description: 'Failed to update featured status', variant: 'destructive' });
    }
  }

  return (
    <AdminLayout title="Spotlight Management">
      <div className="space-y-6">
        {/* Current Spotlight */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              Spotlight Businesses
            </CardTitle>
            <CardDescription>
              These businesses rotate in the Spotlight bar at the top of the homepage
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : featuredBusinesses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No featured businesses. Add some from the eligible businesses below.
              </p>
            ) : (
              <div className="space-y-3">
                {featuredBusinesses.map((business) => (
                  <div
                    key={business.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-yellow-500/5 border-yellow-500/20"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{business.name}</span>
                        <Badge variant="outline" className="capitalize">{business.subscription_plan}</Badge>
                        {(business.subscription_plan === 'premium' || business.subscription_plan === 'elite') && (
                          <Badge variant="secondary">Verified Professional</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {business.city} • {business.category.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleFeatured(business)}
                    >
                      <StarOff className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Eligible Businesses */}
        <Card>
          <CardHeader>
            <CardTitle>Eligible for Featured</CardTitle>
            <CardDescription>
              Elite plan businesses that can be added to featured placement
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : eligibleBusinesses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No eligible businesses. Only Elite plan subscribers can be featured.
              </p>
            ) : (
              <div className="space-y-3">
                {eligibleBusinesses.map((business) => (
                  <div
                    key={business.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{business.name}</span>
                        <Badge variant="outline">Elite</Badge>
                        <Badge variant="secondary">Verified Professional</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {business.city} • {business.category.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleFeatured(business)}
                    >
                      <Star className="h-4 w-4 mr-2" />
                      Add to Featured
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
