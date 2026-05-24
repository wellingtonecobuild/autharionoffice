import { useEffect } from "react";
import { Link } from "react-router-dom";
import { MapPin, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface LocationData {
  name: string;
  count: number;
  suburbs: string[];
  slug: string;
}

const locationConfig = [
  {
    name: "Wellington City",
    slug: "wellington-city",
    suburbs: ["Te Aro", "Thorndon", "Kelburn", "Newtown", "Miramar"],
    cityMatch: ["Wellington", "Wellington City", "Te Aro", "Thorndon", "Kelburn", "Newtown", "Miramar"],
  },
  {
    name: "Lower Hutt",
    slug: "lower-hutt",
    suburbs: ["Petone", "Eastbourne", "Wainuiomata", "Stokes Valley"],
    cityMatch: ["Lower Hutt", "Petone", "Eastbourne", "Wainuiomata", "Stokes Valley"],
  },
  {
    name: "Upper Hutt",
    slug: "upper-hutt",
    suburbs: ["Totara Park", "Silverstream", "Trentham", "Heretaunga"],
    cityMatch: ["Upper Hutt", "Totara Park", "Silverstream", "Trentham", "Heretaunga"],
  },
  {
    name: "Porirua",
    slug: "porirua",
    suburbs: ["Titahi Bay", "Paremata", "Plimmerton", "Whitby"],
    cityMatch: ["Porirua", "Titahi Bay", "Paremata", "Plimmerton", "Whitby"],
  },
  {
    name: "Kāpiti Coast",
    slug: "kāpiti-coast",
    suburbs: ["Paraparaumu", "Waikanae", "Ōtaki", "Raumati"],
    cityMatch: ["Kāpiti Coast", "Kapiti Coast", "Paraparaumu", "Waikanae", "Ōtaki", "Otaki", "Raumati"],
  },
];

const LocationsSection = () => {
  const queryClient = useQueryClient();

  const { data: locations, isLoading: loading } = useQuery({
    queryKey: ["location-counts"],
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
          name: loc.name,
          count,
          suburbs: loc.suburbs,
          slug: loc.slug,
        };
      });
    },
    staleTime: 5 * 60 * 1000,
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("location-counts-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "businesses_public" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["location-counts"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const defaultLocations: LocationData[] = locationConfig.map((loc) => ({
    name: loc.name,
    count: 0,
    suburbs: loc.suburbs,
    slug: loc.slug,
  }));

  const displayLocations = locations || defaultLocations;

  return (
    <section className="py-20 lg:py-28 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
          <div>
            <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-semibold mb-4">
              Service Areas
            </span>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
              Wellington Region Coverage
            </h2>
          </div>
        </div>

        {/* Locations Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {displayLocations.map((location, index) => (
            <Link
              key={location.name}
              to={`/location/${location.slug}`}
              className="group bg-card rounded-2xl p-6 border border-border hover:border-accent/50 hover:shadow-elegant transition-all duration-300 animate-fade-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center group-hover:bg-accent transition-colors">
                  <MapPin className="w-5 h-5 text-accent group-hover:text-accent-foreground transition-colors" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-accent transition-colors">
                    {location.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {loading ? (
                      <Loader2 className="w-3 h-3 animate-spin inline" />
                    ) : (
                      `${location.count} businesses`
                    )}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 mb-4">
                {location.suburbs.slice(0, 3).map((suburb) => (
                  <p key={suburb} className="text-sm text-muted-foreground">
                    {suburb}
                  </p>
                ))}
                {location.suburbs.length > 3 && (
                  <p className="text-sm text-accent">
                    +{location.suburbs.length - 3} more
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1 text-sm font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                View businesses
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LocationsSection;
