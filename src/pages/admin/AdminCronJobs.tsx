import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Clock, RefreshCw, Play, CheckCircle2, XCircle, AlertTriangle, Timer, Activity } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface ScheduledTaskNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  metadata: {
    task?: string;
    businesses_checked?: number;
    reminders_sent?: number;
    errors_count?: number;
    run_at?: string;
    [key: string]: any;
  };
  created_at: string;
  is_read: boolean;
}

export default function AdminCronJobs() {
  const [taskNotifications, setTaskNotifications] = useState<ScheduledTaskNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningJob, setRunningJob] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch scheduled task notifications
    const { data: notifications, error: notifError } = await supabase
      .from('admin_notifications')
      .select('*')
      .eq('type', 'scheduled_task')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!notifError && notifications) {
      setTaskNotifications(notifications as ScheduledTaskNotification[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const runJobManually = async (jobName: string) => {
    setRunningJob(jobName);
    
    try {
      // Map job names to their edge functions
      const jobFunctionMap: Record<string, string> = {
        'daily-subscription-renewal-check': 'check-subscription-renewals',
        'check-expiring-documents': 'check-expiring-documents',
      };

      const functionName = jobFunctionMap[jobName];
      
      if (!functionName) {
        toast.error('Unknown job function');
        return;
      }

      const { error } = await supabase.functions.invoke(functionName);

      if (error) {
        toast.error(`Failed to run ${jobName}: ${error.message}`);
      } else {
        toast.success(`Successfully triggered ${jobName}`);
        // Refresh the data
        setTimeout(fetchData, 2000);
      }
    } catch (err) {
      toast.error('Failed to run job manually');
    } finally {
      setRunningJob(null);
    }
  };

  const parseSchedule = (schedule: string): string => {
    // Parse common cron expressions
    const patterns: Record<string, string> = {
      '* * * * *': 'Every minute',
      '*/5 * * * *': 'Every 5 minutes',
      '*/15 * * * *': 'Every 15 minutes',
      '*/30 * * * *': 'Every 30 minutes',
      '0 * * * *': 'Every hour',
      '0 */2 * * *': 'Every 2 hours',
      '0 */6 * * *': 'Every 6 hours',
      '0 */12 * * *': 'Every 12 hours',
      '0 0 * * *': 'Daily at midnight',
      '0 9 * * *': 'Daily at 9:00 AM',
      '0 0 * * 0': 'Weekly on Sunday',
      '0 0 1 * *': 'Monthly on the 1st',
    };
    return patterns[schedule] || schedule;
  };

  // Define known cron jobs for display
  const knownCronJobs = [
    {
      name: 'daily-subscription-renewal-check',
      schedule: '0 9 * * *',
      description: 'Checks for upcoming subscription renewals and sends reminder emails',
      function: 'check-subscription-renewals',
      active: true,
    },
  ];

  // Get the last run for a specific job
  const getLastRun = (jobName: string) => {
    const jobTask = knownCronJobs.find(j => j.name === jobName);
    if (!jobTask) return null;
    
    return taskNotifications.find(n => 
      n.metadata?.task === jobTask.function || 
      n.metadata?.task === jobName
    );
  };

  return (
    <AdminLayout title="Scheduled Jobs">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Scheduled Jobs</h1>
            <p className="text-muted-foreground">Manage and monitor cron jobs and scheduled tasks</p>
          </div>
          <Button onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <Tabs defaultValue="jobs" className="space-y-4">
          <TabsList>
            <TabsTrigger value="jobs">Scheduled Jobs</TabsTrigger>
            <TabsTrigger value="history">Run History</TabsTrigger>
          </TabsList>

          <TabsContent value="jobs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Active Cron Jobs
                </CardTitle>
                <CardDescription>
                  Scheduled tasks running on your backend
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job Name</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Last Run</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {knownCronJobs.map((job) => {
                      const lastRun = getLastRun(job.name);
                      return (
                        <TableRow key={job.name}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{job.name}</span>
                              <span className="text-xs text-muted-foreground">{job.description}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm">{parseSchedule(job.schedule)}</span>
                              <code className="text-xs text-muted-foreground">{job.schedule}</code>
                            </div>
                          </TableCell>
                          <TableCell>
                            {lastRun ? (
                              <span className="text-sm text-muted-foreground">
                                {formatDistanceToNow(new Date(lastRun.created_at), { addSuffix: true })}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">Never</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {job.active ? (
                              <Badge className="bg-green-500">Active</Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => runJobManually(job.name)}
                              disabled={runningJob === job.name}
                            >
                              {runningJob === job.name ? (
                                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <Play className="h-4 w-4 mr-1" />
                              )}
                              Run Now
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Task Run History
                </CardTitle>
                <CardDescription>
                  Recent scheduled task executions and their results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {taskNotifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                      <Timer className="h-12 w-12 mb-4 opacity-50" />
                      <p>No task runs recorded yet</p>
                      <p className="text-sm">Scheduled task results will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {taskNotifications.map((notification) => (
                        <div
                          key={notification.id}
                          className="flex items-start gap-4 p-4 rounded-lg border bg-card"
                        >
                          <div className={`p-2 rounded-full ${
                            (notification.metadata?.errors_count || 0) > 0 
                              ? 'bg-yellow-500/10 text-yellow-500' 
                              : 'bg-green-500/10 text-green-500'
                          }`}>
                            {(notification.metadata?.errors_count || 0) > 0 ? (
                              <AlertTriangle className="h-5 w-5" />
                            ) : (
                              <CheckCircle2 className="h-5 w-5" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="font-medium">{notification.title}</h4>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {notification.message}
                            </p>
                            {notification.metadata && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {notification.metadata.task && (
                                  <Badge variant="outline">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {notification.metadata.task}
                                  </Badge>
                                )}
                                {notification.metadata.businesses_checked !== undefined && (
                                  <Badge variant="secondary">
                                    Checked: {notification.metadata.businesses_checked}
                                  </Badge>
                                )}
                                {notification.metadata.reminders_sent !== undefined && (
                                  <Badge className={notification.metadata.reminders_sent > 0 ? 'bg-blue-500' : ''}>
                                    Sent: {notification.metadata.reminders_sent}
                                  </Badge>
                                )}
                                {(notification.metadata.errors_count || 0) > 0 && (
                                  <Badge variant="destructive">
                                    Errors: {notification.metadata.errors_count}
                                  </Badge>
                                )}
                              </div>
                            )}
                            {notification.metadata?.run_at && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Ran at: {format(new Date(notification.metadata.run_at), 'PPpp')}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
