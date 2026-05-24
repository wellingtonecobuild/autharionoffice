import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Filter } from 'lucide-react';

interface MapFiltersProps {
  category: string;
  setCategory: (value: string) => void;
  city: string;
  setCity: (value: string) => void;
  verifiedOnly: boolean;
  setVerifiedOnly: (value: boolean) => void;
  subscriptionTier: 'all' | 'premium' | 'elite';
  setSubscriptionTier: (value: 'all' | 'premium' | 'elite') => void;
}

const categories = [
  { value: 'all', label: 'All Categories' },
  { value: 'eco-builders', label: 'Eco Builders' },
  { value: 'suppliers', label: 'Suppliers' },
  { value: 'architects', label: 'Architects' },
  { value: 'renovation', label: 'Renovation' },
];

const cities = [
  { value: 'all', label: 'All Wellington Region' },
  { value: 'Wellington City', label: 'Wellington City' },
  { value: 'Lower Hutt', label: 'Lower Hutt' },
  { value: 'Upper Hutt', label: 'Upper Hutt' },
  { value: 'Porirua', label: 'Porirua' },
  { value: 'Kāpiti Coast', label: 'Kāpiti Coast' },
];

export function MapFilters({
  category,
  setCategory,
  city,
  setCity,
  verifiedOnly,
  setVerifiedOnly,
  subscriptionTier,
  setSubscriptionTier,
}: MapFiltersProps) {
  return (
    <div className="bg-card/95 backdrop-blur-sm border border-border rounded-xl p-4 shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-4 h-4 text-primary" />
        <span className="font-medium text-sm">Filter Listings</span>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Location</Label>
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {cities.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Tier</Label>
          <Select value={subscriptionTier} onValueChange={(v) => setSubscriptionTier(v as 'all' | 'premium' | 'elite')}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Listings</SelectItem>
              <SelectItem value="premium">Premium & Elite</SelectItem>
              <SelectItem value="elite">Elite Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3 pt-5">
          <Switch
            id="verified-only"
            checked={verifiedOnly}
            onCheckedChange={setVerifiedOnly}
          />
          <Label htmlFor="verified-only" className="text-sm cursor-pointer">
            Verified Only
          </Label>
        </div>
      </div>
    </div>
  );
}
