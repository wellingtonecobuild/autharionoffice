import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { addDays, differenceInDays } from 'date-fns';

interface BuilderAvailabilityProps {
  businessId: string;
}

export function BuilderAvailability({ businessId }: BuilderAvailabilityProps) {
  const { data: availability, isLoading } = useQuery({
    queryKey: ['builder-availability', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('builder_availability')
        .select('*')
        .eq('business_id', businessId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="animate-pulse">
            <div className="h-14 bg-muted"></div>
            <div className="p-5 space-y-4">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-16 bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentProjects = availability?.current_projects || 0;
  const maxProjects = availability?.max_projects || 5;
  const workloadPercent = Math.min((currentProjects / maxProjects) * 100, 100);
  const isAccepting = availability?.is_accepting_bookings ?? true;
  const avgDays = availability?.average_project_days || 30;
  const leadTimeDays = availability?.booking_lead_time_days || 14;

  const nextAvailable = availability?.next_available_date 
    ? new Date(availability.next_available_date)
    : addDays(new Date(), leadTimeDays);

  const daysUntilAvailable = Math.max(0, differenceInDays(nextAvailable, new Date()));

  const getAvailabilityStatus = () => {
    if (!isAccepting) return { 
      label: 'Not Accepting Bookings', 
      variant: 'secondary' as const,
      bgColor: 'bg-muted',
      textColor: 'text-muted-foreground',
      icon: AlertTriangle
    };
    if (workloadPercent >= 100) return { 
      label: 'Fully Booked', 
      variant: 'destructive' as const,
      bgColor: 'bg-destructive/10',
      textColor: 'text-destructive',
      icon: AlertTriangle
    };
    if (workloadPercent >= 80) return { 
      label: 'Limited Availability', 
      variant: 'secondary' as const,
      bgColor: 'bg-amber-50 dark:bg-amber-950/30',
      textColor: 'text-amber-700 dark:text-amber-400',
      icon: Clock
    };
    if (workloadPercent >= 50) return { 
      label: 'Moderately Available', 
      variant: 'secondary' as const,
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
      textColor: 'text-blue-700 dark:text-blue-400',
      icon: Clock
    };
    return { 
      label: 'Available Now', 
      variant: 'default' as const,
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
      textColor: 'text-emerald-700 dark:text-emerald-400',
      icon: CheckCircle2
    };
  };

  const status = getAvailabilityStatus();
  const StatusIcon = status.icon;
  const slotsRemaining = maxProjects - currentProjects;

  const getWaitTimeDisplay = () => {
    if (daysUntilAvailable === 0) {
      return { text: 'Available Immediately', subtext: 'Ready to start your project', color: 'text-emerald-600 dark:text-emerald-400' };
    }
    if (daysUntilAvailable <= 7) {
      return { text: `${daysUntilAvailable} Days`, subtext: 'Short wait time', color: 'text-emerald-600 dark:text-emerald-400' };
    }
    if (daysUntilAvailable <= 14) {
      return { text: `${daysUntilAvailable} Days`, subtext: 'Moderate wait time', color: 'text-amber-600 dark:text-amber-400' };
    }
    if (daysUntilAvailable <= 30) {
      return { text: `${Math.ceil(daysUntilAvailable / 7)} Weeks`, subtext: 'Extended wait time', color: 'text-amber-600 dark:text-amber-400' };
    }
    return { text: `${Math.ceil(daysUntilAvailable / 30)} Months`, subtext: 'Long wait time', color: 'text-orange-600 dark:text-orange-400' };
  };

  const waitTime = getWaitTimeDisplay();

  return (
    <Card className="overflow-hidden border-border/60">
      {/* Header Banner */}
      <div className={`px-5 py-3.5 ${status.bgColor} border-b border-border/40`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-md bg-background/60 ${status.textColor}`}>
              <StatusIcon className="w-4 h-4" />
            </div>
            <span className={`font-semibold text-sm ${status.textColor}`}>
              {status.label}
            </span>
          </div>
          {isAccepting && (
            <Badge 
              variant="outline" 
              className="bg-background/80 border-border/50 text-xs font-medium"
            >
              Accepting Enquiries
            </Badge>
          )}
        </div>
      </div>

      {/* Notes */}
      {availability?.notes && (
        <div className="px-5 py-3.5 bg-muted/10 border-t border-border/40">
          <p className="text-sm text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Note:</span> {availability.notes}
          </p>
        </div>
      )}
    </Card>
  );
}
