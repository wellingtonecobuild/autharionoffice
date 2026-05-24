import { cn } from "@/lib/utils";
import { MapPin } from "lucide-react";

type BlogCategory = 
  | "wellington_construction_news"
  | "sustainable_building"
  | "supplier_updates"
  | "projects_developments"
  | "renovation_retrofit"
  | "regulations_compliance"
  | "market_trends"
  | "eco_building_education"
  | "construction_opportunities"
  | "construction_finance"
  | "design_architecture"
  | "technology_innovation"
  | "health_safety_compliance"
  | "sustainability_standards"
  | "industry_insights";

// Categories organized by scope
const CATEGORY_FILTERS = [
  { value: "all", label: "All", scope: "all" },
  // Wellington-specific
  { value: "wellington_construction_news", label: "Wellington Insights", scope: "wellington" },
  // Other categories (no NZ scope label)
  { value: "regulations_compliance", label: "Regulations & Codes", scope: "general" },
  { value: "sustainability_standards", label: "Sustainability Standards", scope: "general" },
  { value: "sustainable_building", label: "Sustainable Building", scope: "general" },
  { value: "technology_innovation", label: "Technology & Innovation", scope: "general" },
  { value: "market_trends", label: "Market Trends", scope: "general" },
  { value: "industry_insights", label: "Industry Insights", scope: "general" },
  { value: "supplier_updates", label: "Materials & Suppliers", scope: "general" },
  { value: "projects_developments", label: "Major Projects", scope: "general" },
  { value: "eco_building_education", label: "Education", scope: "general" },
  { value: "health_safety_compliance", label: "Health & Safety", scope: "general" },
  { value: "renovation_retrofit", label: "Renovation", scope: "general" },
];

interface CategoryTabsProps {
  selected: string;
  onChange: (value: string) => void;
  counts?: Record<string, number>;
}

export const CategoryTabs = ({ selected, onChange, counts }: CategoryTabsProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORY_FILTERS.map((cat) => (
        <button
          key={cat.value}
          onClick={() => onChange(cat.value)}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 inline-flex items-center gap-1.5",
            selected === cat.value
              ? "bg-accent text-accent-foreground shadow-sm"
              : "bg-background text-foreground hover:bg-accent/10 hover:text-accent border border-border"
          )}
        >
          {cat.scope === "wellington" && <MapPin className="w-3.5 h-3.5" />}
          {cat.label}
          {counts && counts[cat.value] !== undefined && (
            <span className="ml-1 text-xs opacity-60">({counts[cat.value]})</span>
          )}
        </button>
      ))}
    </div>
  );
};
