import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search as SearchIcon, MapPin, Star, Loader2, Building2, BadgeCheck } from "lucide-react";

interface Business {
  id: string;
  name: string;
  description: string;
  category: string;
  city: string;
  rating: number;
  review_count: number;
  is_verified: boolean;
  subscription_plan: string;
  images: string[];
}

const locations = [
  "Wellington City",
  "Lower Hutt",
  "Upper Hutt",
  "Porirua",
  "Kāpiti Coast",
];

const Search = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [location, setLocation] = useState(searchParams.get("location") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");

  const q = searchParams.get("q") || "";
  const loc = searchParams.get("location") || "";
  const cat = searchParams.get("category") || "";

  const { data: results = [], isLoading: loading } = useQuery({
    queryKey: ["search-results", q, loc, cat],
    queryFn: async () => {
      let query = supabase
        .from("businesses_public")
        .select("*");

      if (q) {
        query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
      }

      if (loc) {
        query = query.ilike("city", `%${loc}%`);
      }

      if (cat && ["eco-builders", "suppliers", "architects", "renovation"].includes(cat)) {
        query = query.eq("category", cat as "eco-builders" | "suppliers" | "architects" | "renovation");
      }

      const { data } = await query.order("is_featured", { ascending: false });
      return (data || []) as Business[];
    },
  });

  // Real-time subscription for search results
  useEffect(() => {
    const channel = supabase
      .channel('search-results-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'businesses_public'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['search-results'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("q", searchTerm);
    if (location) params.set("location", location);
    if (category) params.set("category", category);
    setSearchParams(params);
  };

  return (
    <>
      <Helmet>
        <title>Search Results | Wellington EcoBuild</title>
        <meta name="description" content="Search for sustainable builders, suppliers, and architects in Wellington." />
      </Helmet>

      <Header />

      <main className="pt-20 lg:pt-24 min-h-screen bg-muted">
        <div className="container mx-auto px-4 py-8">
          {/* Search Filters */}
          <div className="bg-card rounded-xl border border-border p-4 mb-8">
            <div className="grid sm:grid-cols-4 gap-4">
              <div className="sm:col-span-2 relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search businesses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=" ">All Locations</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleSearch} className="w-full">
                <SearchIcon className="w-4 h-4 mr-2" />
                Search
              </Button>
            </div>
          </div>

          {/* Results */}
          <div className="mb-4">
            <h1 className="font-display text-2xl font-bold text-foreground">
              {searchParams.get("q") ? `Results for "${searchParams.get("q")}"` : "All Businesses"}
            </h1>
            <p className="text-muted-foreground">
              {results.length} {results.length === 1 ? "business" : "businesses"} found
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          ) : results.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                  No businesses found
                </h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your search terms or filters.
                </p>
                <Button variant="outline" onClick={() => {
                  setSearchTerm("");
                  setLocation("");
                  setSearchParams(new URLSearchParams());
                }}>
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((business) => (
                <Link key={business.id} to={`/business/${business.id}`}>
                  <Card className="h-full hover:shadow-lg transition-shadow">
                    <div className="aspect-video relative overflow-hidden rounded-t-lg bg-muted">
                      {business.images?.[0] ? (
                        <img
                          src={business.images[0]}
                          alt={business.name}
                          loading="lazy"
                          className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full flex items-center justify-center ${business.images?.[0] ? 'hidden' : ''}`}>
                        <Building2 className="w-12 h-12 text-muted-foreground opacity-50" />
                      </div>
                      {/* Blue verified tick badge on image - only for premium/elite */}
                      {(business.subscription_plan === 'premium' || business.subscription_plan === 'elite') && (
                        <div className="absolute bottom-2 right-2 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                          <BadgeCheck className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <div className="mb-2">
                        <h3 className="font-display font-semibold text-foreground line-clamp-1">
                          {business.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-muted-foreground capitalize">
                            {business.category?.replace('-', ' ')}
                          </span>
                          {(business.subscription_plan === 'premium' || business.subscription_plan === 'elite') && (
                            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1 py-0 px-1.5">
                              <BadgeCheck className="w-3 h-3" />
                              Verified Professional
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {business.description || "No description available."}
                      </p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          {business.city}
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-accent text-accent" />
                          {business.rating || 0} ({business.review_count || 0})
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
};

export default Search;
