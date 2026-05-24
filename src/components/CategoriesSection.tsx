import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Hammer, Package, Compass, RefreshCw, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface CategoryCounts {
  "eco-builders": number;
  suppliers: number;
  architects: number;
  renovation: number;
}

const CategoriesSection = () => {
  const queryClient = useQueryClient();

  const { data: counts, isLoading: loading } = useQuery({
    queryKey: ["category-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses_public")
        .select("category")
        .eq("status", "active");

      if (error) throw error;

      const categoryCounts: CategoryCounts = {
        "eco-builders": 0,
        suppliers: 0,
        architects: 0,
        renovation: 0,
      };

      (data || []).forEach((business) => {
        if (business.category && business.category in categoryCounts) {
          categoryCounts[business.category as keyof CategoryCounts]++;
        }
      });

      return categoryCounts;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("category-counts-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "businesses_public" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["category-counts"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const defaultCounts: CategoryCounts = {
    "eco-builders": 0,
    suppliers: 0,
    architects: 0,
    renovation: 0,
  };

  const categories = [
    {
      icon: Hammer,
      title: "Certified Eco-Builders",
      description: "Homestar & Passive House certified builders committed to sustainable construction practices in Wellington.",
      categoryKey: "eco-builders" as keyof CategoryCounts,
      href: "/category/eco-builders",
      gradient: "from-primary to-forest-light",
    },
    {
      icon: Package,
      title: "Sustainable Material Suppliers",
      description: "Environmentally responsible suppliers of timber, insulation, roofing, and construction materials.",
      categoryKey: "suppliers" as keyof CategoryCounts,
      href: "/category/suppliers",
      gradient: "from-accent to-gold-light",
    },
    {
      icon: Compass,
      title: "Green Architects & Designers",
      description: "Architects specializing in energy-efficient and environmentally conscious design in Wellington.",
      categoryKey: "architects" as keyof CategoryCounts,
      href: "/category/architects",
      gradient: "from-forest-light to-primary",
    },
    {
      icon: RefreshCw,
      title: "Renovation & Retrofitting Specialists",
      description: "Experts in upgrading existing homes for better energy efficiency and sustainability.",
      categoryKey: "renovation" as keyof CategoryCounts,
      href: "/category/renovation",
      gradient: "from-secondary to-charcoal-light",
    },
  ];

  return (
    <section className="section-padding bg-background relative overflow-hidden">
      {/* Subtle background accent */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-accent/[0.02] rounded-full blur-[100px]" />
      
      <div className="container mx-auto px-4 relative">
        {/* Header */}
        <div className="text-center content-narrow mb-16">
          <span className="pill-premium mb-6 inline-flex">
            Browse by Category
          </span>
          <h2 className="font-display text-foreground mb-5">
            Find the Right Partner for Your Project
          </h2>
          <p className="text-body-large">
            Wellington's most comprehensive directory of verified eco-construction professionals.
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {categories.map((category, index) => (
            <Link
              key={category.title}
              to={category.href}
              className="group relative card-premium p-8 animate-fade-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Icon */}
              <div className={`icon-container-lg bg-gradient-to-br ${category.gradient} mb-6 group-hover:scale-110 transition-transform duration-500`}>
                <category.icon className="w-7 h-7 text-primary-foreground" />
              </div>

              {/* Content */}
              <h3 className="font-display text-xl font-bold text-foreground mb-3 group-hover:text-accent transition-colors duration-300">
                {category.title}
              </h3>
              <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                {category.description}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-border/50">
                <span className="text-sm font-semibold text-muted-foreground">
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin inline" />
                  ) : (
                    <span className="text-accent">{(counts || defaultCounts)[category.categoryKey]}</span>
                  )}
                  {" "}verified
                </span>
                <div className="icon-container-sm bg-muted group-hover:bg-accent transition-colors duration-300">
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-accent-foreground transition-colors duration-300" />
                </div>
              </div>

              {/* Hover glow effect */}
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" 
                style={{ boxShadow: 'inset 0 0 0 1px hsl(var(--accent) / 0.2)' }} 
              />
            </Link>
          ))}
        </div>

        {/* Supplier Sub-categories */}
        <div className="mt-20 p-8 lg:p-12 bg-muted/30 rounded-3xl border border-border/50">
          <div className="flex items-center gap-3 mb-8">
            <div className="icon-container-md bg-accent/10">
              <Package className="w-5 h-5 text-accent" />
            </div>
            <h3 className="font-display text-xl font-bold text-foreground">
              Material Supplier Categories
            </h3>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {[
              "Timber & Framing",
              "Concrete & Aggregates",
              "Steel & Metal",
              "Insulation",
              "Roofing Materials",
              "Plumbing Supplies",
              "Electrical Supplies",
              "Windows & Doors",
              "Flooring",
              "Paint & Coatings",
              "Cladding & Exterior",
              "Hardware & Fasteners",
              "Kitchen & Bathroom",
            ].map((sub) => (
              <Link
                key={sub}
                to={`/category/suppliers/${sub.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-")}`}
                className="px-4 py-2.5 bg-card rounded-xl text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-300 border border-border/60 hover:border-accent shadow-soft hover:shadow-elegant"
              >
                {sub}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
