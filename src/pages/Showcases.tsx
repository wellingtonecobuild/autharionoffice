import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Images, Search, MapPin, Calendar, DollarSign, Clock, ArrowRight, ArrowLeft, Star, Building2, Leaf } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface Showcase {
  id: string;
  business_id: string;
  title: string;
  slug: string;
  description: string | null;
  project_type: string | null;
  suburb: string | null;
  budget_range: string | null;
  duration: string | null;
  completion_date: string | null;
  before_images: string[] | null;
  after_images: string[] | null;
  gallery_images: string[] | null;
  video_url: string | null;
  client_testimonial: string | null;
  client_name: string | null;
  challenges: string | null;
  solutions: string | null;
  materials_used: string[] | null;
  sustainability_features: string[] | null;
  is_featured: boolean;
  view_count: number;
  tags: string[] | null;
  business?: {
    id: string;
    name: string;
    category: string;
    is_verified: boolean;
  };
}

const PROJECT_TYPES = {
  renovation: { label: 'Renovation', color: 'bg-blue-500' },
  new_build: { label: 'New Build', color: 'bg-green-500' },
  extension: { label: 'Extension', color: 'bg-purple-500' },
  commercial: { label: 'Commercial', color: 'bg-orange-500' },
};

const Showcases = () => {
  const [showcases, setShowcases] = useState<Showcase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedShowcase, setSelectedShowcase] = useState<Showcase | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const fetchShowcases = async () => {
      const { data } = await supabase
        .from('project_showcases')
        .select(`
          *,
          business:businesses(id, name, category, is_verified)
        `)
        .eq('is_approved', true)
        .eq('status', 'approved')
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (data) setShowcases(data as Showcase[]);
      setLoading(false);
    };

    fetchShowcases();
  }, []);

  const filteredShowcases = showcases.filter(s => {
    const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.suburb?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || s.project_type === selectedType;
    return matchesSearch && matchesType;
  });

  const projectTypes = ['all', ...new Set(showcases.map(s => s.project_type).filter(Boolean))];

  const getAllImages = (showcase: Showcase) => {
    const images: { url: string; type: 'before' | 'after' | 'gallery' }[] = [];
    showcase.before_images?.forEach(img => images.push({ url: img, type: 'before' }));
    showcase.after_images?.forEach(img => images.push({ url: img, type: 'after' }));
    showcase.gallery_images?.forEach(img => images.push({ url: img, type: 'gallery' }));
    return images;
  };

  const openShowcase = async (showcase: Showcase) => {
    setSelectedShowcase(showcase);
    setCurrentImageIndex(0);
    
    // Increment view count
    await supabase
      .from('project_showcases')
      .update({ view_count: showcase.view_count + 1 })
      .eq('id', showcase.id);
  };

  return (
    <>
      <Helmet>
        <title>Project Showcases | Before & After Gallery | Wellington EcoBuild</title>
        <meta name="description" content="Browse stunning before and after photos of construction projects in Wellington. Get inspired by renovations, new builds, and commercial projects." />
      </Helmet>

      <Header />

      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Hero */}
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">
              <Images className="h-3 w-3 mr-1" />
              Project Gallery
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Project Showcases
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Get inspired by real construction projects from verified Wellington professionals. See the transformations and learn about the process.
            </p>

            {/* Search */}
            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search projects by name or location..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Filter */}
          <div className="flex flex-wrap gap-2 mb-8 justify-center">
            {projectTypes.map((type) => (
              <Button
                key={type}
                variant={selectedType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType(type)}
                className="capitalize"
              >
                {type === 'all' ? 'All Projects' : PROJECT_TYPES[type as keyof typeof PROJECT_TYPES]?.label || type}
              </Button>
            ))}
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-[4/3] bg-muted animate-pulse rounded-lg"></div>
              ))}
            </div>
          ) : filteredShowcases.length === 0 ? (
            <Card className="text-center p-12">
              <Images className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No showcases found</h3>
              <p className="text-muted-foreground mb-6">Be the first to showcase your project!</p>
              <Link to="/dashboard">
                <Button>Add Your Project</Button>
              </Link>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredShowcases.map((showcase) => (
                <Card 
                  key={showcase.id} 
                  className="overflow-hidden cursor-pointer hover:shadow-xl transition-all group"
                  onClick={() => openShowcase(showcase)}
                >
                  <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                    {showcase.after_images?.[0] ? (
                      <img 
                        src={showcase.after_images[0]} 
                        alt={showcase.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                      />
                    ) : showcase.before_images?.[0] ? (
                      <img 
                        src={showcase.before_images[0]} 
                        alt={showcase.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Images className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    
                    {/* Overlay badges */}
                    <div className="absolute top-3 left-3 flex gap-2">
                      {showcase.is_featured && (
                        <Badge className="bg-primary">Featured</Badge>
                      )}
                      {showcase.project_type && (
                        <Badge className={PROJECT_TYPES[showcase.project_type as keyof typeof PROJECT_TYPES]?.color || 'bg-gray-500'}>
                          {PROJECT_TYPES[showcase.project_type as keyof typeof PROJECT_TYPES]?.label || showcase.project_type}
                        </Badge>
                      )}
                    </div>

                    {/* Before/After indicator */}
                    {showcase.before_images?.length && showcase.after_images?.length && (
                      <div className="absolute bottom-3 right-3">
                        <Badge variant="secondary" className="bg-black/70 text-white">
                          Before & After
                        </Badge>
                      </div>
                    )}
                  </div>

                  <CardContent className="p-4">
                    <h3 className="font-bold text-foreground mb-1 line-clamp-1">{showcase.title}</h3>
                    
                    {showcase.business && (
                      <p className="text-sm text-primary mb-2">by {showcase.business.name}</p>
                    )}

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      {showcase.suburb && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {showcase.suburb}
                        </span>
                      )}
                      {showcase.budget_range && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" /> {showcase.budget_range}
                        </span>
                      )}
                    </div>

                    {showcase.sustainability_features && showcase.sustainability_features.length > 0 && (
                      <div className="mt-2 flex items-center gap-1 text-green-600">
                        <Leaf className="h-4 w-4" />
                        <span className="text-xs">Sustainable</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Showcase Detail Modal */}
        <Dialog open={!!selectedShowcase} onOpenChange={() => setSelectedShowcase(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedShowcase && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl">{selectedShowcase.title}</DialogTitle>
                  {selectedShowcase.business && (
                    <Link to={`/business/${selectedShowcase.business.id}`} className="text-primary hover:underline">
                      by {selectedShowcase.business.name}
                    </Link>
                  )}
                </DialogHeader>

                {/* Image Gallery */}
                {getAllImages(selectedShowcase).length > 0 && (
                  <div className="relative">
                    <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                      <img 
                        src={getAllImages(selectedShowcase)[currentImageIndex]?.url} 
                        alt={`${selectedShowcase.title} - Image ${currentImageIndex + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <Badge className="absolute top-3 left-3 capitalize">
                        {getAllImages(selectedShowcase)[currentImageIndex]?.type}
                      </Badge>
                    </div>
                    
                    {getAllImages(selectedShowcase).length > 1 && (
                      <div className="flex justify-between mt-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setCurrentImageIndex(i => i === 0 ? getAllImages(selectedShowcase).length - 1 : i - 1)}
                        >
                          <ArrowLeft className="h-4 w-4 mr-1" /> Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          {currentImageIndex + 1} / {getAllImages(selectedShowcase).length}
                        </span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setCurrentImageIndex(i => i === getAllImages(selectedShowcase).length - 1 ? 0 : i + 1)}
                        >
                          Next <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Project Details */}
                <div className="grid sm:grid-cols-2 gap-4 mt-4">
                  {selectedShowcase.suburb && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedShowcase.suburb}</span>
                    </div>
                  )}
                  {selectedShowcase.budget_range && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedShowcase.budget_range}</span>
                    </div>
                  )}
                  {selectedShowcase.duration && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedShowcase.duration}</span>
                    </div>
                  )}
                  {selectedShowcase.completion_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Completed {format(new Date(selectedShowcase.completion_date), 'MMMM yyyy')}</span>
                    </div>
                  )}
                </div>

                {selectedShowcase.description && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">About This Project</h4>
                    <p className="text-muted-foreground">{selectedShowcase.description}</p>
                  </div>
                )}

                {selectedShowcase.challenges && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Challenges</h4>
                    <p className="text-muted-foreground">{selectedShowcase.challenges}</p>
                  </div>
                )}

                {selectedShowcase.solutions && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Solutions</h4>
                    <p className="text-muted-foreground">{selectedShowcase.solutions}</p>
                  </div>
                )}

                {selectedShowcase.materials_used && selectedShowcase.materials_used.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Materials Used</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedShowcase.materials_used.map((material) => (
                        <Badge key={material} variant="outline">{material}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedShowcase.sustainability_features && selectedShowcase.sustainability_features.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Leaf className="h-4 w-4 text-green-600" /> Sustainability Features
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedShowcase.sustainability_features.map((feature) => (
                        <Badge key={feature} variant="outline" className="border-green-600 text-green-600">{feature}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedShowcase.client_testimonial && (
                  <Card className="mt-4 bg-muted/50">
                    <CardContent className="p-4">
                      <Star className="h-5 w-5 text-yellow-500 fill-current mb-2" />
                      <p className="italic text-foreground">"{selectedShowcase.client_testimonial}"</p>
                      {selectedShowcase.client_name && (
                        <p className="text-sm text-muted-foreground mt-2">— {selectedShowcase.client_name}</p>
                      )}
                    </CardContent>
                  </Card>
                )}

                <div className="flex gap-4 mt-6">
                  <Link to={`/business/${selectedShowcase.business?.id}`} className="flex-1">
                    <Button className="w-full">View Business Profile</Button>
                  </Link>
                  <Link to="/estimate" className="flex-1">
                    <Button variant="outline" className="w-full">Get Similar Quote</Button>
                  </Link>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </main>

      <Footer />
    </>
  );
};

export default Showcases;
