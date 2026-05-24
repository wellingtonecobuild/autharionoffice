import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Download, FileText, Video, Calculator, CheckSquare, Search, Eye, Clock, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Resource {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  resource_type: string;
  category: string | null;
  featured_image: string | null;
  file_url: string | null;
  video_url: string | null;
  download_count: number;
  view_count: number;
  is_premium: boolean;
  is_featured: boolean;
  tags: string[] | null;
}

const RESOURCE_ICONS = {
  guide: BookOpen,
  checklist: CheckSquare,
  template: FileText,
  calculator: Calculator,
  video: Video,
};

const CATEGORY_LABELS = {
  planning: 'Planning',
  budgeting: 'Budgeting',
  hiring: 'Hiring',
  permits: 'Permits',
  maintenance: 'Maintenance',
};

const Resources = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');

  useEffect(() => {
    const fetchResources = async () => {
      const { data } = await supabase
        .from('resources')
        .select('*')
        .eq('is_published', true)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (data) setResources(data);
      setLoading(false);
    };

    fetchResources();
  }, []);

  const filteredResources = resources.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || r.resource_type === selectedType;
    return matchesSearch && matchesType;
  });

  const featuredResources = resources.filter(r => r.is_featured);
  const resourceTypes = ['all', ...new Set(resources.map(r => r.resource_type))];

  const handleDownload = async (resource: Resource) => {
    // Increment download count
    await supabase
      .from('resources')
      .update({ download_count: resource.download_count + 1 })
      .eq('id', resource.id);

    if (resource.file_url) {
      window.open(resource.file_url, '_blank');
    }
  };

  const ResourceIcon = ({ type }: { type: string }) => {
    const Icon = RESOURCE_ICONS[type as keyof typeof RESOURCE_ICONS] || FileText;
    return <Icon className="h-5 w-5" />;
  };

  return (
    <>
      <Helmet>
        <title>Resource Library | Free Guides & Templates | Wellington EcoBuild</title>
        <meta name="description" content="Free guides, checklists, templates, and tools for homeowners and builders. Everything you need to plan your construction or renovation project." />
      </Helmet>

      <Header />

      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Hero */}
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">
              <BookOpen className="h-3 w-3 mr-1" />
              Free Resources
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Resource Library
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Free guides, checklists, templates, and tools to help you plan and execute your construction project with confidence.
            </p>

            {/* Search */}
            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search resources..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Featured Resources */}
          {featuredResources.length > 0 && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-foreground mb-6">Featured Resources</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {featuredResources.slice(0, 3).map((resource) => (
                  <Card key={resource.id} className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                    <Badge className="absolute top-4 right-4 bg-primary">Featured</Badge>
                    <CardContent className="p-6">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                        <ResourceIcon type={resource.resource_type} />
                      </div>
                      <Badge variant="outline" className="mb-2 capitalize">{resource.resource_type}</Badge>
                      <h3 className="text-lg font-bold text-foreground mb-2">{resource.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{resource.description}</p>
                      <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                        <span className="flex items-center gap-1"><Eye className="h-4 w-4" /> {resource.view_count} views</span>
                        <span className="flex items-center gap-1"><Download className="h-4 w-4" /> {resource.download_count}</span>
                      </div>
                      <Button className="w-full gap-2" onClick={() => handleDownload(resource)}>
                        <Download className="h-4 w-4" /> Download Free
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2 mb-8">
            {resourceTypes.map((type) => (
              <Button
                key={type}
                variant={selectedType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType(type)}
                className="capitalize gap-2"
              >
                {type !== 'all' && <ResourceIcon type={type} />}
                {type === 'all' ? 'All Resources' : `${type}s`}
              </Button>
            ))}
          </div>

          {/* All Resources */}
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 bg-muted animate-pulse rounded-lg"></div>
              ))}
            </div>
          ) : filteredResources.length === 0 ? (
            <Card className="text-center p-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No resources found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filter</p>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredResources.map((resource) => (
                <Card key={resource.id} className="h-full hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <ResourceIcon type={resource.resource_type} />
                      </div>
                      {resource.is_premium && (
                        <Badge variant="secondary">Premium</Badge>
                      )}
                    </div>
                    <div className="flex gap-2 mb-2">
                      <Badge variant="outline" className="capitalize text-xs">{resource.resource_type}</Badge>
                      {resource.category && (
                        <Badge variant="outline" className="text-xs">
                          {CATEGORY_LABELS[resource.category as keyof typeof CATEGORY_LABELS] || resource.category}
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-bold text-foreground mb-2">{resource.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{resource.description}</p>
                    
                    {resource.tags && resource.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {resource.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-xs bg-muted px-2 py-1 rounded">{tag}</span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                      <span className="flex items-center gap-1"><Eye className="h-4 w-4" /> {resource.view_count}</span>
                      <span className="flex items-center gap-1"><Download className="h-4 w-4" /> {resource.download_count}</span>
                    </div>

                    <Button 
                      variant="outline" 
                      className="w-full gap-2" 
                      onClick={() => handleDownload(resource)}
                    >
                      <Download className="h-4 w-4" />
                      {resource.is_premium ? 'Get Access' : 'Download Free'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* CTA */}
          <Card className="mt-12 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-4">Need a Custom Resource?</h2>
              <p className="opacity-90 mb-6 max-w-xl mx-auto">
                Can't find what you're looking for? Contact us and we'll help you with personalized guidance for your project.
              </p>
              <Link to="/contact">
                <Button size="lg" variant="secondary" className="gap-2">
                  Contact Us <ArrowRight className="h-4 w-4" />
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

export default Resources;
