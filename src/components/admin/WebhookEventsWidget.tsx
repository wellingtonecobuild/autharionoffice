import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { 
  Webhook, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RefreshCw,
  CreditCard,
  UserPlus,
  AlertTriangle,
  Receipt,
  Zap,
  Search,
  Filter,
  X
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface WebhookEvent {
  id: string;
  event_type: string;
  event_id: string;
  payload: any;
  status: string;
  processed_at: string | null;
  error_message: string | null;
  created_at: string;
}

const eventTypeIcons: Record<string, any> = {
  'checkout.session.completed': CreditCard,
  'customer.subscription.created': UserPlus,
  'customer.subscription.updated': RefreshCw,
  'customer.subscription.deleted': XCircle,
  'payment_intent.succeeded': CheckCircle2,
  'payment_intent.payment_failed': AlertTriangle,
  'invoice.payment_succeeded': Receipt,
  'invoice.payment_failed': AlertTriangle,
  'charge.refunded': Receipt,
};

const getEventColor = (eventType: string): string => {
  if (eventType.includes('succeeded') || eventType.includes('completed')) {
    return 'bg-green-500/10 text-green-500 border-green-500/20';
  }
  if (eventType.includes('failed') || eventType.includes('deleted')) {
    return 'bg-red-500/10 text-red-500 border-red-500/20';
  }
  if (eventType.includes('updated')) {
    return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
  }
  return 'bg-muted text-muted-foreground';
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'processed':
      return <Badge variant="default" className="bg-green-500">Processed</Badge>;
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>;
    case 'received':
      return <Badge variant="secondary">Received</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const EVENT_TYPES = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'charge.refunded',
];

const STATUS_OPTIONS = ['all', 'processed', 'failed', 'received'];

export function WebhookEventsWidget() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('webhook_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      setEvents(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('webhook-events-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'webhook_events',
        },
        (payload) => {
          setEvents((prev) => [payload.new as WebhookEvent, ...prev.slice(0, 99)]);
        }
      )
      .subscribe((status) => {
        setIsLive(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter events based on search and filters
  useEffect(() => {
    let filtered = events;

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (event) =>
          event.event_type.toLowerCase().includes(query) ||
          event.event_id.toLowerCase().includes(query) ||
          event.error_message?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((event) => event.status === statusFilter);
    }

    // Apply event type filter
    if (eventTypeFilter !== 'all') {
      filtered = filtered.filter((event) => event.event_type === eventTypeFilter);
    }

    setFilteredEvents(filtered);
  }, [events, searchQuery, statusFilter, eventTypeFilter]);

  const formatEventType = (type: string) => {
    return type.split('.').slice(-2).join(' ').replace(/_/g, ' ');
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setEventTypeFilter('all');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || eventTypeFilter !== 'all';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-primary" />
            Webhook Events
          </CardTitle>
          <CardDescription>Real-time Stripe webhook activity</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {isLive && (
            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
              <Zap className="h-3 w-3 mr-1" />
              Live
            </Badge>
          )}
          <Button variant="ghost" size="icon" onClick={fetchEvents} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="processed">Processed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="received">Received</SelectItem>
            </SelectContent>
          </Select>
          <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Event Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {EVENT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {formatEventType(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="icon" onClick={clearFilters}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Results count */}
        {hasActiveFilters && (
          <p className="text-sm text-muted-foreground">
            Showing {filteredEvents.length} of {events.length} events
          </p>
        )}

        <ScrollArea className="h-[300px] pr-4">
          {filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Webhook className="h-12 w-12 mb-4 opacity-50" />
              {hasActiveFilters ? (
                <>
                  <p>No events match your filters</p>
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    Clear filters
                  </Button>
                </>
              ) : (
                <>
                  <p>No webhook events yet</p>
                  <p className="text-sm">Events will appear here in real-time</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((event) => {
                const Icon = eventTypeIcons[event.event_type] || Webhook;
                return (
                  <div
                    key={event.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${getEventColor(event.event_type)}`}
                  >
                    <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm capitalize truncate">
                          {formatEventType(event.event_type)}
                        </span>
                        {getStatusBadge(event.status)}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {event.event_id}
                      </p>
                      {event.error_message && (
                        <p className="text-xs text-red-500 mt-1 truncate">
                          {event.error_message}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
