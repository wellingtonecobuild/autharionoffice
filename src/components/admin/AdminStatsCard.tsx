import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminStatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}

const variantStyles = {
  default: {
    card: 'bg-card border-border',
    icon: 'bg-muted text-muted-foreground',
    value: 'text-foreground',
  },
  primary: {
    card: 'bg-admin-navy border-admin-navy-light',
    icon: 'bg-admin-teal/20 text-admin-teal',
    value: 'text-white',
  },
  success: {
    card: 'bg-card border-admin-success/30',
    icon: 'bg-admin-success/10 text-admin-success',
    value: 'text-admin-success',
  },
  warning: {
    card: 'bg-card border-admin-warning/30',
    icon: 'bg-admin-warning/10 text-admin-warning',
    value: 'text-admin-warning',
  },
  danger: {
    card: 'bg-card border-admin-error/30',
    icon: 'bg-admin-error/10 text-admin-error',
    value: 'text-admin-error',
  },
};

export function AdminStatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  variant = 'default',
  className,
}: AdminStatsCardProps) {
  const styles = variantStyles[variant];

  return (
    <Card className={cn(styles.card, 'shadow-sm', className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className={cn(
              'text-xs font-medium uppercase tracking-wide',
              variant === 'primary' ? 'text-slate-400' : 'text-muted-foreground'
            )}>
              {title}
            </p>
            <p className={cn('text-2xl font-bold tabular-nums', styles.value)}>
              {value}
            </p>
            {subtitle && (
              <p className={cn(
                'text-xs',
                variant === 'primary' ? 'text-slate-400' : 'text-muted-foreground'
              )}>
                {subtitle}
              </p>
            )}
            {trend && trendValue && (
              <div className={cn(
                'flex items-center gap-1 text-xs font-medium',
                trend === 'up' && 'text-admin-success',
                trend === 'down' && 'text-admin-error',
                trend === 'neutral' && 'text-muted-foreground'
              )}>
                {trend === 'up' && '↑'}
                {trend === 'down' && '↓'}
                <span>{trendValue}</span>
              </div>
            )}
          </div>
          {Icon && (
            <div className={cn('p-2 rounded-lg', styles.icon)}>
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
