import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MapPin, Search, Building2, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Suburb {
  id: string;
  name: string;
  slug: string;
  region: string;
  description: string | null;
}

const Suburbs = () => {
  const [suburbs, setSuburbs] = useState<Suburb[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSuburbs = async () => {
      const { data } = await supabase
        .from('wellington_suburbs')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (data) setSuburbs(data);
      setLoading(false);
    };

    fetchSuburbs();
  }, []);

  const filteredSuburbs = suburbs.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.region.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedSuburbs = filteredSuburbs.reduce((acc, suburb) => {
    if (!acc[suburb.region]) acc[suburb.region] = [];
    acc[suburb.region].push(suburb);
    return acc;
  }, {} as Record<string, Suburb[]>);

  return (
    <>
      <Helmet>
        <title>Wellington Suburbs | Find Builders & Contractors by Area | Wellington EcoBuild</title>
        <meta name="description" content="Browse all Wellington suburbs to find trusted builders, contractors, and construction professionals in your area. From Wellington Central to the Hutt Valley." />
      </Helmet>

      <Header />

      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Hero */}
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">
              <MapPin className="h-3 w-3 mr-1" />
              All Wellington Region
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Find Professionals by Suburb
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Browse our network of verified builders and contractors across the greater Wellington region.
            </p>

            {/* Search */}
            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search suburbs..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Suburbs Grid by Region */}
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="h-24 bg-muted animate-pulse rounded-lg"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-12">
              {Object.entries(groupedSuburbs).map(([region, regionSuburbs]) => (
                <div key={region}>
                  <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                    <Building2 className="h-6 w-6 text-primary" />
                    {region}
                  </h2>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {regionSuburbs.map((suburb) => (
                      <Link key={suburb.id} to={`/suburb/${suburb.slug}`}>
                        <Card className="h-full hover:shadow-lg hover:border-primary/50 transition-all group">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                  {suburb.name}
                                </h3>
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                  {suburb.description || `Builders & contractors in ${suburb.name}`}
                                </p>
                              </div>
                              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredSuburbs.length === 0 && !loading && (
            <div className="text-center py-12">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No suburbs found</h3>
              <p className="text-muted-foreground">Try adjusting your search</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
};

export default Suburbs;
