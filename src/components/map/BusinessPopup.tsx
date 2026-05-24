import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, CheckCircle2, Globe, ExternalLink, Phone, BadgeCheck, Lock } from 'lucide-react';
import { MapBusiness } from '@/hooks/useMapBusinesses';
import { normalizeWebsiteUrl } from '@/lib/validation';
import { useAuth } from '@/hooks/useAuth';

interface BusinessPopupProps {
  business: MapBusiness;
  onClose: () => void;
}

const categoryLabels: Record<string, string> = {
  'eco-builders': 'Eco Builder',
  'suppliers': 'Supplier',
  'architects': 'Architect',
  'renovation': 'Renovation',
};

export function BusinessPopup({ business, onClose }: BusinessPopupProps) {
  const { user } = useAuth();
  const isSpotlight = business.pin_priority === 'spotlight';
  const isPaidPlan = business.subscription_plan === 'premium' || business.subscription_plan === 'elite';

  const getWebsiteUrl = (url: string) => {
    return normalizeWebsiteUrl(url) || '#';
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-xl overflow-hidden w-72 animate-scale-in">
      {/* Header with featured label */}
      {isSpotlight && (
        <div className="bg-accent/10 px-3 py-1.5 border-b border-border">
          <span className="text-xs font-medium text-accent">Featured</span>
        </div>
      )}
      
      <div className="p-4">
        {/* Business image - Only show for paid plans */}
        {isPaidPlan && business.images?.[0] && (
          <div className="w-full h-24 rounded-lg overflow-hidden mb-3 bg-muted">
            <img 
              src={business.images[0]} 
              alt={business.name || 'Business'}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Business info */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-foreground leading-tight">
              {business.name}
            </h3>
            {/* Verified badge - paid plans only */}
            {business.is_verified && isPaidPlan && (
              <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="text-xs">
              {categoryLabels[business.category || ''] || business.category}
            </Badge>
            {/* Verified Professional badge - premium/elite only */}
            {isPaidPlan && (
              <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1 py-0">
                <BadgeCheck className="w-3 h-3" />
                Verified Professional
              </Badge>
            )}
          </div>

          <p className="text-xs text-muted-foreground line-clamp-2">
            {business.description || 'Sustainable construction services in Wellington'}
          </p>

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3" />
            <span>{business.address}, {business.city}</span>
          </div>
        </div>

        {/* Direct Contact */}
        <div className="flex flex-col gap-2 mt-4">
          {/* Website - Paid plans only, requires login */}
          {user && isPaidPlan && business.website && (
            <a 
              href={getWebsiteUrl(business.website)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full h-9 bg-accent text-accent-foreground rounded-md text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              <Globe className="w-4 h-4" />
              Visit Website
              <ExternalLink className="w-3 h-3" />
            </a>
          )}

          {/* View Full Profile / Sign In button */}
          {user ? (
            <Button asChild variant={isPaidPlan && business.website ? "outline" : "default"} size="sm" className="w-full h-9">
              <Link to={`/business/${business.id}`}>
                <Phone className="w-4 h-4 mr-2" />
                View Contact Details
              </Link>
            </Button>
          ) : (
            <Button asChild size="sm" className="w-full h-9">
              <Link to="/auth">
                <Lock className="w-4 h-4 mr-2" />
                Sign In for Details
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
