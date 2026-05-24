import { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, Activity, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeVariant?: 'default' | 'success' | 'warning' | 'error';
  actions?: ReactNode;
  showLiveIndicator?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}

export function AdminPageHeader({ 
  title, 
  subtitle, 
  badge,
  badgeVariant = 'default',
  actions,
  showLiveIndicator = true,
  onRefresh,
  refreshing = false,
  icon: Icon = Shield
}: AdminPageHeaderProps) {
  const badgeColors = {
    default: 'bg-admin-teal/20 text-admin-teal border-admin-teal/30',
    success: 'bg-admin-success/20 text-admin-success border-admin-success/30',
    warning: 'bg-admin-warning/20 text-admin-warning border-admin-warning/30',
    error: 'bg-admin-error/20 text-admin-error border-admin-error/30',
  };

  return (
    <div className="bg-admin-navy rounded-lg border border-admin-navy-light/30 overflow-hidden">
      <div className="px-4 sm:px-6 py-4 sm:py-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-2.5 bg-admin-navy-light rounded-lg flex-shrink-0">
              <Icon className="h-5 w-5 text-admin-teal" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h1 className="text-lg sm:text-xl font-semibold text-white tracking-tight truncate">
                  {title}
                </h1>
                {badge && (
                  <Badge className={cn('text-xs font-medium border', badgeColors[badgeVariant])}>
                    {badge}
                  </Badge>
                )}
                {showLiveIndicator && (
                  <div className="hidden sm:flex items-center gap-1.5 text-xs text-admin-success">
                    <Activity className="h-3 w-3 animate-pulse" />
                    <span className="font-medium">LIVE</span>
                  </div>
                )}
              </div>
              {subtitle && (
                <p className="text-sm text-slate-400 mt-0.5 line-clamp-1">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={refreshing}
                className="border-admin-navy-light text-slate-300 hover:text-white hover:bg-admin-navy-light"
              >
                <RefreshCw className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')} />
                Refresh
              </Button>
            )}
            {actions}
          </div>
        </div>
      </div>
    </div>
  );
}
