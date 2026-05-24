import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Building2, Users, TrendingUp, Star, ArrowRight, Phone, Home } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Suburb {
  id: string;
  name: string;
  slug: string;
  region: string;
  description?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  featured_image?: string | null;
  population?: number | null;
  median_house_price?: number | null;
  growth_rate?: number | null;
}

interface Business {
  id: string;
  name: string;
  category: string;
  description: string | null;
  rating: number | null;
  review_count: number | null;
  is_verified: boolean;
  images: string[] | null;
}

const SuburbPage = () => {
  const { slug } = useParams();
  const [suburb, setSuburb] = useState<Suburb | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [allSuburbs, setAllSuburbs] = useState<Suburb[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!slug) return;

      // Fetch suburb details
      const { data: suburbData } = await supabase
        .from('wellington_suburbs')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (suburbData) {
        setSuburb(suburbData);

        // Fetch businesses in this suburb/city
        const { data: businessData } = await supabase
          .from('businesses_public')
          .select('*')
          .or(`city.ilike.%${suburbData.name}%,address.ilike.%${suburbData.name}%`)
          .limit(12);

        if (businessData) setBusinesses(businessData as Business[]);
      }

      // Fetch all suburbs for navigation
      const { data: suburbsData } = await supabase
        .from('wellington_suburbs')
        .select('id, name, slug, region')
        .eq('is_active', true)
        .order('name');

      if (suburbsData) setAllSuburbs(suburbsData);

      setLoading(false);
    };

    fetchData();
  }, [slug]);

  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-background pt-24 pb-16">
          <div className="container mx-auto px-4">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-1/3"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!suburb) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-background pt-24 pb-16">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Suburb Not Found</h1>
            <p className="text-muted-foreground mb-6">The suburb you're looking for doesn't exist.</p>
            <Link to="/suburbs">
              <Button>View All Suburbs</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{suburb.seo_title || `${suburb.name} Builders & Contractors | Wellington EcoBuild`}</title>
        <meta name="description" content={suburb.seo_description || `Find trusted builders, contractors, and construction professionals in ${suburb.name}, ${suburb.region}. Compare quotes, read reviews, and hire verified experts.`} />
        <meta name="keywords" content={`${suburb.name} builders, ${suburb.name} contractors, construction ${suburb.name}, renovation ${suburb.name}, Wellington builders`} />
        <link rel="canonical" href={`https://wellingtonecobuild.nz/suburb/${suburb.slug}`} />
      </Helmet>

      <Header />

      <main className="min-h-screen bg-background pt-24 pb-16">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Link to="/" className="hover:text-primary">Home</Link>
              <span>/</span>
              <Link to="/suburbs" className="hover:text-primary">Suburbs</Link>
              <span>/</span>
              <span className="text-foreground">{suburb.name}</span>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div>
                <Badge variant="outline" className="mb-4">
                  <MapPin className="h-3 w-3 mr-1" />
                  {suburb.region}
                </Badge>
                <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                  Builders & Contractors in {suburb.name}
                </h1>
                <p className="text-lg text-muted-foreground mb-6">
                  {suburb.description || `Find verified construction professionals serving ${suburb.name}. Compare quotes, read reviews, and hire with confidence.`}
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link to={`/search?location=${suburb.name}`}>
                    <Button size="lg" className="gap-2">
                      <Building2 className="h-4 w-4" />
                      Find Professionals
                    </Button>
                  </Link>
                  <Link to="/estimate">
                    <Button size="lg" variant="outline" className="gap-2">
                      Get Free Quotes
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-6 text-center">
                    <Building2 className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-3xl font-bold text-foreground">{businesses.length}+</p>
                    <p className="text-sm text-muted-foreground">Verified Pros</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 text-center">
                    <Home className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-3xl font-bold text-foreground">
                      {suburb.median_house_price ? `$${(suburb.median_house_price / 1000).toFixed(0)}k` : 'N/A'}
                    </p>
                    <p className="text-sm text-muted-foreground">Median Price</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 text-center">
                    <Users className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-3xl font-bold text-foreground">
                      {suburb.population ? suburb.population.toLocaleString() : 'N/A'}
                    </p>
                    <p className="text-sm text-muted-foreground">Population</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 text-center">
                    <TrendingUp className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-3xl font-bold text-foreground">
                      {suburb.growth_rate ? `${suburb.growth_rate}%` : '+3.2%'}
                    </p>
                    <p className="text-sm text-muted-foreground">Growth Rate</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Professionals Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Top Professionals in {suburb.name}</h2>
                <p className="text-muted-foreground">Verified contractors serving your area</p>
              </div>
              <Link to={`/search?location=${suburb.name}`}>
                <Button variant="outline" className="gap-2">
                  View All <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            {businesses.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {businesses.slice(0, 8).map((business) => (
                  <Link key={business.id} to={`/business/${business.id}`}>
                    <Card className="h-full hover:shadow-lg transition-shadow">
                      <div className="aspect-video bg-muted relative overflow-hidden rounded-t-lg">
                        {business.images?.[0] ? (
                          <img src={business.images[0]} alt={business.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Building2 className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                        {business.is_verified && (
                          <Badge className="absolute top-2 right-2 bg-green-600">Verified</Badge>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-foreground mb-1 line-clamp-1">{business.name}</h3>
                        <p className="text-sm text-muted-foreground mb-2 capitalize">{business.category.replace(/_/g, ' ')}</p>
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          <span className="text-sm font-medium">{business.rating?.toFixed(1) || '5.0'}</span>
                          <span className="text-sm text-muted-foreground">({business.review_count || 0} reviews)</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <Card className="text-center p-12">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No professionals listed yet</h3>
                <p className="text-muted-foreground mb-4">Be the first to list your business in {suburb.name}</p>
                <Link to="/list-business">
                  <Button>List Your Business</Button>
                </Link>
              </Card>
            )}
          </div>
        </section>

        {/* Other Suburbs */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold text-foreground mb-8">Explore Other Suburbs</h2>
            <div className="flex flex-wrap gap-2">
              {allSuburbs
                .filter(s => s.slug !== suburb.slug)
                .map((s) => (
                  <Link key={s.id} to={`/suburb/${s.slug}`}>
                    <Badge variant="outline" className="text-sm py-2 px-4 hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer">
                      {s.name}
                    </Badge>
                  </Link>
                ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground overflow-hidden">
              <CardContent className="p-8 md:p-12 text-center">
                <h2 className="text-3xl font-bold mb-4">Ready to Start Your Project in {suburb.name}?</h2>
                <p className="text-lg opacity-90 mb-6 max-w-2xl mx-auto">
                  Get free quotes from verified professionals in your area. Compare prices, read reviews, and hire with confidence.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Link to="/estimate">
                    <Button size="lg" variant="secondary" className="gap-2">
                      Get Free Quotes
                    </Button>
                  </Link>
                  <Link to="/contact">
                    <Button size="lg" variant="outline" className="gap-2 bg-transparent border-white text-white hover:bg-white/10">
                      <Phone className="h-4 w-4" />
                      Contact Us
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default SuburbPage;
