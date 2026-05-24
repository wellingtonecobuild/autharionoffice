import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, MapPin, CheckCircle, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const locationMeta: Record<string, { name: string; description: string; suburbs: string[]; cityFilter: string }> = {
  "wellington-city": {
    name: "Wellington City",
    description: "Find sustainable builders, suppliers, and architects in Wellington City including Te Aro, Thorndon, Newtown, Karori, and more.",
    suburbs: ["Te Aro", "Thorndon", "Newtown", "Karori", "Kilbirnie", "Miramar", "Island Bay", "Brooklyn", "Mt Cook", "Kelburn"],
    cityFilter: "Wellington",
  },
  "lower-hutt": {
    name: "Lower Hutt",
    description: "Discover eco-friendly construction professionals in Lower Hutt including Petone, Eastbourne, and surrounding areas.",
    suburbs: ["Petone", "Eastbourne", "Wainuiomata", "Stokes Valley", "Naenae", "Waterloo", "Avalon"],
    cityFilter: "Lower Hutt",
  },
  "upper-hutt": {
    name: "Upper Hutt",
    description: "Connect with sustainable construction experts in Upper Hutt and the surrounding valley areas.",
    suburbs: ["Silverstream", "Trentham", "Totara Park", "Pinehaven", "Heretaunga", "Brown Owl"],
    cityFilter: "Upper Hutt",
  },
  porirua: {
    name: "Porirua",
    description: "Find sustainable builders and suppliers serving Porirua, Titahi Bay, Plimmerton, and surrounding areas.",
    suburbs: ["Titahi Bay", "Plimmerton", "Paremata", "Whitby", "Aotea", "Cannons Creek"],
    cityFilter: "Porirua",
  },
  "kapiti-coast": {
    name: "Kāpiti Coast",
    description: "Discover eco-conscious construction professionals along the Kāpiti Coast from Paekākāriki to Ōtaki.",
    suburbs: ["Paraparaumu", "Waikanae", "Ōtaki", "Raumati", "Paekākāriki", "Peka Peka"],
    cityFilter: "Kapiti",
  },
};

const LocationDetail = () => {
  const { slug } = useParams();
  const location = locationMeta[slug || ""] || locationMeta["wellington-city"];

  const { data: businesses, isLoading } = useQuery({
    queryKey: ["location-businesses", location.cityFilter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses_public")
        .select("id, name, category, rating, review_count, address, city, is_verified")
        .or(`city.ilike.%${location.cityFilter}%,address.ilike.%${location.cityFilter}%`)
        .in("status", ["active", "approved"])
        .order("rating", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      "eco-builders": "Eco-Builders",
      "suppliers": "Suppliers",
      "architects": "Architects",
      "renovation": "Renovation",
    };
    return labels[category] || category;
  };

  return (
    <>
      <Helmet>
        <title>Sustainable Builders in {location.name} | Wellington EcoBuild</title>
        <meta name="description" content={location.description} />
      </Helmet>

      <Header />

      <main className="pt-20 lg:pt-24">
        {/* Hero */}
        <section className="bg-gradient-to-br from-forest to-forest-light py-16 lg:py-20">
          <div className="container mx-auto px-4">
            <Link to="/locations" className="inline-flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              All Locations
            </Link>
            <Badge variant="outline" className="mb-4 border-accent/50 text-accent">
              {location.name}
            </Badge>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4">
              Eco-Builders in {location.name}
            </h1>
            <p className="text-primary-foreground/80 text-lg max-w-2xl">
              {location.description}
            </p>
          </div>
        </section>

        {/* Suburbs */}
        <section className="py-8 bg-muted border-b border-border">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-foreground mr-2">Suburbs:</span>
              {location.suburbs.map((suburb: string) => (
                <Badge key={suburb} variant="secondary">
                  {suburb}
                </Badge>
              ))}
            </div>
          </div>
        </section>

        {/* Listings */}
        <section className="py-12 lg:py-16">
          <div className="container mx-auto px-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
              </div>
            ) : (
              <>
                <div className="mb-6 text-muted-foreground">
                  {businesses?.length || 0} businesses in {location.name}
                </div>

                {businesses && businesses.length > 0 ? (
                  <div className="grid md:grid-cols-2 gap-6">
                    {businesses.map((listing) => (
                      <Link
                        key={listing.id}
                        to={`/business/${listing.id}`}
                        className="group bg-card rounded-2xl border border-border hover:border-accent/50 hover:shadow-elegant transition-all duration-300 p-6"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-accent transition-colors">
                                {listing.name}
                              </h3>
                              {listing.is_verified && (
                                <CheckCircle className="w-5 h-5 text-accent" />
                              )}
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {getCategoryLabel(listing.category || "")}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-accent text-accent" />
                            <span className="font-medium text-foreground">
                              {listing.rating ? Number(listing.rating).toFixed(1) : "0.0"}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              ({listing.review_count || 0})
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          {listing.address}
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">No listings in this area yet.</p>
                    <div className="flex flex-col items-center">
                      <Button asChild>
                        <Link to="/list-business">Apply to Be Listed</Link>
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        We only accept a limited number of verified builders per area.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default LocationDetail;
