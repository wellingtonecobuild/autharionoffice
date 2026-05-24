import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Clock, 
  CheckCircle, 
  Circle, 
  AlertCircle,
  Building2,
  Calendar,
  MapPin,
  Phone,
  Mail,
  FileText,
  MessageSquare,
  Loader2
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface ProjectTrackerProps {
  initialCode?: string;
}

export function ProjectTracker({ initialCode }: ProjectTrackerProps) {
  const [trackingCode, setTrackingCode] = useState(initialCode || '');
  const [searchCode, setSearchCode] = useState(initialCode || '');

  const { data: booking, isLoading, error, refetch } = useQuery({
    queryKey: ['project-tracking', searchCode],
    queryFn: async () => {
      if (!searchCode) return null;
      
      const { data, error } = await supabase
        .from('project_bookings')
        .select(`
          *,
          businesses:business_id (
            name,
            phone,
            email,
            address,
            city
          )
        `)
        .eq('tracking_code', searchCode.toUpperCase())
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!searchCode,
  });

  const { data: milestones } = useQuery({
    queryKey: ['project-milestones', booking?.id],
    queryFn: async () => {
      if (!booking?.id) return [];
      
      const { data, error } = await supabase
        .from('project_milestones')
        .select('*')
        .eq('booking_id', booking.id)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!booking?.id,
  });

  const { data: updates } = useQuery({
    queryKey: ['project-updates', booking?.id],
    queryFn: async () => {
      if (!booking?.id) return [];
      
      const { data, error } = await supabase
        .from('project_updates')
        .select('*')
        .eq('booking_id', booking.id)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!booking?.id,
  });

  // Real-time subscription for updates
  useEffect(() => {
    if (!booking?.id) return;

    const channel = supabase
      .channel(`project-${booking.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_bookings',
          filter: `id=eq.${booking.id}`,
        },
        () => {
          refetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_milestones',
          filter: `booking_id=eq.${booking.id}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [booking?.id, refetch]);

  const handleSearch = () => {
    setSearchCode(trackingCode.trim().toUpperCase());
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
      pending: { label: 'Pending Review', variant: 'secondary', icon: Clock },
      quoted: { label: 'Quote Sent', variant: 'outline', icon: FileText },
      accepted: { label: 'Accepted', variant: 'default', icon: CheckCircle },
      in_progress: { label: 'In Progress', variant: 'default', icon: Circle },
      completed: { label: 'Completed', variant: 'default', icon: CheckCircle },
      declined: { label: 'Declined', variant: 'destructive', icon: AlertCircle },
      cancelled: { label: 'Cancelled', variant: 'destructive', icon: AlertCircle },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getMilestoneIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (status === 'in_progress') return <Circle className="w-5 h-5 text-blue-500 animate-pulse" />;
    return <Circle className="w-5 h-5 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Track Your Project
          </CardTitle>
          <CardDescription>
            Enter your tracking code to see real-time updates on your project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter tracking code (e.g., A1B2C3D4)"
              value={trackingCode}
              onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="font-mono"
            />
            <Button onClick={handleSearch} disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Track'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && searchCode && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
              <h3 className="font-semibold">Project Not Found</h3>
              <p className="text-muted-foreground">
                No project found with tracking code "{searchCode}". Please check your code and try again.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Project Details */}
      {booking && (
        <>
          {/* Status Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    {(booking.businesses as any)?.name || 'Business'}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Tracking Code: <span className="font-mono font-bold">{booking.tracking_code}</span>
                  </CardDescription>
                </div>
                {getStatusBadge(booking.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Project Details</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{booking.project_type}</span>
                    </div>
                    {booking.property_address && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span>{booking.property_address}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>Submitted {formatDistanceToNow(new Date(booking.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Contact Builder</h4>
                  <div className="space-y-2">
                    {(booking.businesses as any)?.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <a href={`tel:${(booking.businesses as any).phone}`} className="text-primary hover:underline">
                          {(booking.businesses as any).phone}
                        </a>
                      </div>
                    )}
                    {(booking.businesses as any)?.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <a href={`mailto:${(booking.businesses as any).email}`} className="text-primary hover:underline">
                          {(booking.businesses as any).email}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {booking.quoted_amount && (
                <div className="bg-muted/50 rounded-lg p-4 mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Quoted Amount</span>
                    <span className="text-2xl font-bold">${booking.quoted_amount.toLocaleString()}</span>
                  </div>
                  {booking.quoted_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Quoted on {format(new Date(booking.quoted_at), 'MMMM d, yyyy')}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Milestones Timeline */}
          {milestones && milestones.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Project Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  {milestones.map((milestone, index) => (
                    <div key={milestone.id} className="flex gap-4 pb-6 last:pb-0">
                      <div className="flex flex-col items-center">
                        {getMilestoneIcon(milestone.status)}
                        {index < milestones.length - 1 && (
                          <div className={`w-0.5 flex-1 mt-2 ${
                            milestone.status === 'completed' ? 'bg-green-500' : 'bg-muted'
                          }`} />
                        )}
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{milestone.milestone_name}</h4>
                          {milestone.completed_at && (
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(milestone.completed_at), 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>
                        {milestone.description && (
                          <p className="text-sm text-muted-foreground mt-1">{milestone.description}</p>
                        )}
                        {milestone.estimated_date && milestone.status !== 'completed' && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Estimated: {format(new Date(milestone.estimated_date), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Updates */}
          {updates && updates.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Recent Updates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {updates.map((update, index) => (
                    <div key={update.id}>
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{update.title}</h4>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          {update.content && (
                            <p className="text-sm text-muted-foreground mt-1">{update.content}</p>
                          )}
                        </div>
                      </div>
                      {index < updates.length - 1 && <Separator className="mt-4" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
