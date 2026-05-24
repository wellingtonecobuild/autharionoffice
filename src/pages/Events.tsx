import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, MapPin, Users, Clock, ExternalLink, Video, Search, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, isAfter, isBefore, addDays } from 'date-fns';

interface Event {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  event_type: string;
  location: string | null;
  venue_name: string | null;
  city: string;
  is_online: boolean;
  online_url: string | null;
  start_date: string;
  end_date: string | null;
  registration_url: string | null;
  max_attendees: number | null;
  current_attendees: number;
  price: number;
  is_free: boolean;
  featured_image: string | null;
  organizer_name: string | null;
  is_featured: boolean;
  tags: string[] | null;
}

const EVENT_TYPE_LABELS = {
  workshop: { label: 'Workshop', color: 'bg-blue-500' },
  webinar: { label: 'Webinar', color: 'bg-purple-500' },
  networking: { label: 'Networking', color: 'bg-green-500' },
  conference: { label: 'Conference', color: 'bg-orange-500' },
  open_home: { label: 'Open Home', color: 'bg-pink-500' },
  trade_show: { label: 'Trade Show', color: 'bg-red-500' },
};

const Events = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('is_approved', true)
        .eq('status', 'approved')
        .gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true });
      
      if (data) setEvents(data);
      setLoading(false);
    };

    fetchEvents();
  }, []);

  const filteredEvents = events.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || e.event_type === selectedType;
    return matchesSearch && matchesType;
  });

  const upcomingThisWeek = events.filter(e => 
    isBefore(new Date(e.start_date), addDays(new Date(), 7))
  );

  const featuredEvents = events.filter(e => e.is_featured);
  const eventTypes = ['all', ...new Set(events.map(e => e.event_type))];

  const EventCard = ({ event, featured = false }: { event: Event; featured?: boolean }) => (
    <Card className={`h-full hover:shadow-lg transition-shadow ${featured ? 'border-primary/50 bg-gradient-to-br from-primary/5 to-transparent' : ''}`}>
      {event.featured_image && (
        <div className="aspect-video bg-muted relative overflow-hidden rounded-t-lg">
          <img src={event.featured_image} alt={event.title} className="w-full h-full object-cover" />
          {event.is_featured && (
            <Badge className="absolute top-2 right-2 bg-primary">Featured</Badge>
          )}
        </div>
      )}
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-2 mb-3">
          <Badge className={EVENT_TYPE_LABELS[event.event_type as keyof typeof EVENT_TYPE_LABELS]?.color || 'bg-gray-500'}>
            {EVENT_TYPE_LABELS[event.event_type as keyof typeof EVENT_TYPE_LABELS]?.label || event.event_type}
          </Badge>
          {event.is_free ? (
            <Badge variant="outline" className="text-green-600 border-green-600">Free</Badge>
          ) : (
            <Badge variant="outline">${event.price}</Badge>
          )}
        </div>

        <h3 className="font-bold text-foreground mb-2 line-clamp-2">{event.title}</h3>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{event.description}</p>

        <div className="space-y-2 text-sm mb-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{format(new Date(event.start_date), 'EEE, MMM d, yyyy • h:mm a')}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            {event.is_online ? (
              <>
                <Video className="h-4 w-4" />
                <span>Online Event</span>
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4" />
                <span>{event.venue_name || event.location || event.city}</span>
              </>
            )}
          </div>
          {event.max_attendees && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{event.current_attendees}/{event.max_attendees} registered</span>
            </div>
          )}
        </div>

        {event.organizer_name && (
          <p className="text-xs text-muted-foreground mb-4">Organized by {event.organizer_name}</p>
        )}

        <Button 
          className="w-full gap-2" 
          onClick={() => {
            if (event.registration_url) {
              window.open(event.registration_url, '_blank');
            }
          }}
        >
          Register Now <ExternalLink className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <>
      <Helmet>
        <title>Events & Workshops | Wellington Construction Industry | Wellington EcoBuild</title>
        <meta name="description" content="Discover construction industry events, workshops, webinars, and networking opportunities in Wellington. Stay updated with the latest in sustainable building." />
      </Helmet>

      <Header />

      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Hero */}
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">
              <Calendar className="h-3 w-3 mr-1" />
              Industry Events
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Events & Workshops
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Connect with industry professionals, learn new skills, and stay updated with the latest in Wellington's construction industry.
            </p>

            {/* Search */}
            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* This Week */}
          {upcomingThisWeek.length > 0 && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <Clock className="h-6 w-6 text-primary" />
                Happening This Week
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingThisWeek.slice(0, 3).map((event) => (
                  <EventCard key={event.id} event={event} featured />
                ))}
              </div>
            </section>
          )}

          {/* Filter */}
          <div className="flex flex-wrap gap-2 mb-8">
            {eventTypes.map((type) => (
              <Button
                key={type}
                variant={selectedType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType(type)}
                className="capitalize"
              >
                {type === 'all' ? 'All Events' : EVENT_TYPE_LABELS[type as keyof typeof EVENT_TYPE_LABELS]?.label || type}
              </Button>
            ))}
          </div>

          {/* All Events */}
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-80 bg-muted animate-pulse rounded-lg"></div>
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <Card className="text-center p-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No events scheduled</h3>
              <p className="text-muted-foreground mb-6">Know of an industry event? Submit it to help the Wellington construction community stay connected.</p>
              <Link to="/contact">
                <Button>Submit an Event</Button>
              </Link>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}

          {/* Host an Event CTA */}
          <Card className="mt-12 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
            <CardContent className="p-8 md:p-12 text-center">
              <h2 className="text-2xl font-bold mb-4">Want to Host an Event?</h2>
              <p className="opacity-90 mb-6 max-w-xl mx-auto">
                If you're organizing a construction industry event, workshop, or webinar, we'd love to feature it on our platform.
              </p>
              <Link to="/contact">
                <Button size="lg" variant="secondary">
                  Submit Your Event
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default Events;
