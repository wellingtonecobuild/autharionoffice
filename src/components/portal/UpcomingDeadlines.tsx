import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  AlertTriangle, 
  Clock, 
  FileText,
  ArrowRight
} from 'lucide-react';
import { format, differenceInDays, isPast, isToday } from 'date-fns';

interface Deadline {
  id: string;
  type: 'invoice' | 'timesheet' | 'document';
  title: string;
  dueDate: Date;
  status: string;
  link: string;
}

interface UpcomingDeadlinesProps {
  portalUserId: string;
}

export const UpcomingDeadlines = ({ portalUserId }: UpcomingDeadlinesProps) => {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeadlines = async () => {
      try {
        // Fetch invoices with due dates
        const { data: invoices } = await supabase
          .from('contractor_invoices')
          .select('id, invoice_number, due_date, status')
          .eq('portal_user_id', portalUserId)
          .in('status', ['draft', 'submitted', 'approved'])
          .not('due_date', 'is', null)
          .order('due_date', { ascending: true })
          .limit(5);

        const deadlineItems: Deadline[] = [];

        // Add invoice deadlines
        if (invoices) {
          invoices.forEach(inv => {
            if (inv.due_date) {
              deadlineItems.push({
                id: inv.id,
                type: 'invoice',
                title: `Invoice ${inv.invoice_number}`,
                dueDate: new Date(inv.due_date),
                status: inv.status,
                link: `/portal/invoices/${inv.id}`,
              });
            }
          });
        }

        // Add recurring timesheet deadline (every Friday)
        const today = new Date();
        const dayOfWeek = today.getDay();
        const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
        const nextFriday = new Date(today);
        nextFriday.setDate(today.getDate() + daysUntilFriday);
        nextFriday.setHours(17, 0, 0, 0);

        deadlineItems.push({
          id: 'weekly-timesheet',
          type: 'timesheet',
          title: 'Weekly Timesheet Submission',
          dueDate: nextFriday,
          status: 'pending',
          link: '/portal/timesheets',
        });

        // Sort by due date
        deadlineItems.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
        setDeadlines(deadlineItems.slice(0, 5));
      } catch (err) {
        console.error('Error fetching deadlines:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDeadlines();
  }, [portalUserId]);

  const getUrgencyBadge = (dueDate: Date) => {
    if (isPast(dueDate) && !isToday(dueDate)) {
      return <Badge className="bg-red-100 text-red-800">Overdue</Badge>;
    }
    if (isToday(dueDate)) {
      return <Badge className="bg-amber-100 text-amber-800">Due Today</Badge>;
    }
    const daysLeft = differenceInDays(dueDate, new Date());
    if (daysLeft <= 3) {
      return <Badge className="bg-orange-100 text-orange-800">{daysLeft}d left</Badge>;
    }
    if (daysLeft <= 7) {
      return <Badge className="bg-blue-100 text-blue-800">{daysLeft}d left</Badge>;
    }
    return <Badge className="bg-slate-100 text-slate-700">{daysLeft}d left</Badge>;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'invoice':
        return <FileText className="h-4 w-4 text-emerald-600" />;
      case 'timesheet':
        return <Clock className="h-4 w-4 text-amber-600" />;
      default:
        return <Calendar className="h-4 w-4 text-slate-600" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Upcoming Deadlines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4 text-amber-600" />
          Upcoming Deadlines
          {deadlines.some(d => isPast(d.dueDate) && !isToday(d.dueDate)) && (
            <AlertTriangle className="h-4 w-4 text-red-500 ml-auto" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {deadlines.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">
            No upcoming deadlines
          </p>
        ) : (
          <div className="space-y-3">
            {deadlines.map((deadline) => (
              <Link
                key={deadline.id}
                to={deadline.link}
                className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors"
              >
                <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  {getTypeIcon(deadline.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {deadline.title}
                  </p>
                  <p className="text-xs text-slate-500">
                    {format(deadline.dueDate, 'MMM d, yyyy')}
                  </p>
                </div>
                {getUrgencyBadge(deadline.dueDate)}
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
