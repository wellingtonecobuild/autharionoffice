import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { MapPin, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const locationConfig = [
  {
    name: "Wellington City",
    slug: "wellington-city",
    suburbs: ["Te Aro", "Thorndon", "Newtown", "Karori", "Kilbirnie", "Miramar", "Island Bay"],
    cityMatch: ["Wellington", "Wellington City", "Te Aro", "Thorndon", "Kelburn", "Newtown", "Miramar", "Karori", "Kilbirnie", "Island Bay"],
    image: "https://images.unsplash.com/photo-1589871973318-9ca1258faa5d?w=400&h=300&fit=crop",
  },
  {
    name: "Lower Hutt",
    slug: "lower-hutt",
    suburbs: ["Petone", "Eastbourne", "Wainuiomata", "Stokes Valley", "Naenae"],
    cityMatch: ["Lower Hutt", "Petone", "Eastbourne", "Wainuiomata", "Stokes Valley", "Naenae"],
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=300&fit=crop",
  },
  {
    name: "Upper Hutt",
    slug: "upper-hutt",
    suburbs: ["Silverstream", "Trentham", "Totara Park", "Pinehaven"],
    cityMatch: ["Upper Hutt", "Silverstream", "Trentham", "Totara Park", "Pinehaven"],
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=300&fit=crop",
  },
  {
    name: "Porirua",
    slug: "porirua",
    suburbs: ["Titahi Bay", "Plimmerton", "Paremata", "Whitby", "Aotea"],
    cityMatch: ["Porirua", "Titahi Bay", "Plimmerton", "Paremata", "Whitby", "Aotea"],
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&h=300&fit=crop",
  },
  {
    name: "Kāpiti Coast",
    slug: "kapiti-coast",
    suburbs: ["Paraparaumu", "Waikanae", "Ōtaki", "Raumati", "Paekākāriki"],
    cityMatch: ["Kāpiti Coast", "Kapiti Coast", "Paraparaumu", "Waikanae", "Ōtaki", "Otaki", "Raumati", "Paekākāriki"],
    image: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=400&h=300&fit=crop",
  },
];

const Locations = () => {
  const queryClient = useQueryClient();

  const { data: locationCounts, isLoading } = useQuery({
    queryKey: ["locations-page-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses_public")
        .select("city")
        .eq("status", "active");

      if (error) throw error;

      return locationConfig.map((loc) => {
        const count = (data || []).filter((business) => {
          if (!business.city) return false;
          const cityLower = business.city.toLowerCase();
          return loc.cityMatch.some((match) => cityLower.includes(match.toLowerCase()));
        }).length;

        return {
          ...loc,
          listings: count,
        };
      });
    },
    staleTime: 5 * 60 * 1000,
  });

  // Real-time subscription for updates
  useEffect(() => {
    const channel = supabase
      .channel("locations-page-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "businesses_public" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["locations-page-counts"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const locations = locationCounts || locationConfig.map((loc) => ({ ...loc, listings: 0 }));

  return (
    <>
      <Helmet>
        <title>Locations | Wellington EcoBuild</title>
        <meta name="description" content="Find sustainable builders, suppliers, and architects across the Wellington region including Wellington City, Lower Hutt, Upper Hutt, Porirua, and Kāpiti Coast." />
      </Helmet>

      <Header />

      <main className="pt-20 lg:pt-24">
        {/* Hero */}
        <section className="bg-gradient-to-br from-forest to-forest-light py-16 lg:py-20">
          <div className="container mx-auto px-4 text-center">
            <Badge variant="outline" className="mb-4 border-accent/50 text-accent">
              Wellington Region
            </Badge>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4">
              Find Eco-Builders Near You
            </h1>
            <p className="text-primary-foreground/80 text-lg max-w-2xl mx-auto">
              Browse sustainable construction professionals across all areas of the Wellington region.
            </p>
          </div>
        </section>

        {/* Locations Grid */}
        <section className="py-16 lg:py-20">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {locations.map((location) => (
                <Link
                  key={location.name}
                  to={`/location/${location.slug}`}
                  className="group bg-card rounded-2xl border border-border hover:border-accent/50 hover:shadow-elegant transition-all duration-300 overflow-hidden"
                >
                  <div className="h-48 relative overflow-hidden">
                    <img
                      src={location.image}
                      alt={location.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-accent" />
                        <h3 className="font-display text-xl font-semibold text-foreground">
                          {location.name}
                        </h3>
                      </div>
                    </div>
                  </div>
                  <div className="p-5">
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {location.suburbs.join(", ")}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin inline mr-1" />
                        ) : (
                          `${location.listings} listings`
                        )}
                      </span>
                      <ArrowRight className="w-5 h-5 text-accent opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Map Section */}
        <section className="py-16 lg:py-20 bg-muted">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10">
              <h2 className="font-display text-2xl lg:text-3xl font-bold text-foreground mb-4">
                Wellington Region Coverage
              </h2>
              <p className="text-muted-foreground mb-6">
                We serve all areas within the Greater Wellington Region.
              </p>
              <Link
                to="/map"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
              >
                <MapPin className="w-5 h-5" />
                View Interactive Map
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {locations.map((location) => (
                <Link
                  key={location.slug}
                  to={`/location/${location.slug}`}
                  className="p-4 bg-card rounded-xl border border-border hover:border-accent/50 transition-colors text-center"
                >
                  <MapPin className="w-6 h-6 text-accent mx-auto mb-2" />
                  <p className="font-medium text-sm">{location.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isLoading ? "..." : `${location.listings} listings`}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default Locations;
