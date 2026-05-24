import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { InteractiveMap } from '@/components/map/InteractiveMap';
import { MapFilters } from '@/components/map/MapFilters';
import { MapLegend } from '@/components/map/MapLegend';
import { useMapBusinesses } from '@/hooks/useMapBusinesses';
import { useMapboxToken } from '@/hooks/useMapboxToken';
import { Button } from '@/components/ui/button';
import { MapPin, Expand, Shrink, Loader2 } from 'lucide-react';

export default function Map() {
  const [category, setCategory] = useState('all');
  const [city, setCity] = useState('all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<'all' | 'premium' | 'elite'>('all');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { token: mapboxToken, loading: tokenLoading, error: tokenError } = useMapboxToken();

  const { businesses, loading, error } = useMapBusinesses({
    category: category === 'all' ? undefined : category,
    city: city === 'all' ? undefined : city,
    verifiedOnly,
    subscriptionTier,
  });

  return (
    <>
      <Helmet>
        <title>Find Eco-Professionals | Interactive Map | Wellington EcoBuild</title>
        <meta 
          name="description" 
          content="Discover verified eco-builders, sustainable suppliers, and green architects across Wellington, Lower Hutt, Upper Hutt, Porirua, and Kāpiti Coast on our interactive map." 
        />
      </Helmet>

      <Header />

      <main className={`${isFullscreen ? 'fixed inset-0 z-50 bg-background' : 'min-h-screen pt-20 pb-16'}`}>
        <div className={`${isFullscreen ? 'h-full flex flex-col' : 'container mx-auto px-4'}`}>
          {/* Header */}
          <div className={`${isFullscreen ? 'p-4 border-b border-border flex-shrink-0' : 'mb-6'}`}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-display font-bold">
                    Explore Wellington Region
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {businesses.length} eco-professional{businesses.length !== 1 ? 's' : ''} found
                  </p>
                </div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="hidden md:flex"
              >
                {isFullscreen ? (
                  <>
                    <Shrink className="w-4 h-4 mr-1" />
                    Exit Fullscreen
                  </>
                ) : (
                  <>
                    <Expand className="w-4 h-4 mr-1" />
                    Fullscreen
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Token loading state */}
          {tokenLoading && (
            <div className="mb-6 p-6 bg-muted/50 rounded-xl border border-border flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Loading map configuration...</span>
            </div>
          )}

          {/* Token error state */}
          {tokenError && !tokenLoading && (
            <div className="mb-6 p-6 bg-destructive/10 rounded-xl border border-destructive/20">
              <p className="text-sm text-destructive">{tokenError}</p>
            </div>
          )}

          {/* Filters */}
          <div className={`${isFullscreen ? 'px-4 py-3 flex-shrink-0' : 'mb-4'}`}>
            <MapFilters
              category={category}
              setCategory={setCategory}
              city={city}
              setCity={setCity}
              verifiedOnly={verifiedOnly}
              setVerifiedOnly={setVerifiedOnly}
              subscriptionTier={subscriptionTier}
              setSubscriptionTier={setSubscriptionTier}
            />
          </div>

          {/* Map Container */}
          <div className={`relative ${isFullscreen ? 'flex-1 px-4 pb-4' : 'h-[600px] md:h-[700px]'}`}>
            <div className="relative w-full h-full">
              <InteractiveMap 
                businesses={businesses}
                loading={loading || tokenLoading}
                mapboxToken={mapboxToken || ''}
              />
              
              {/* Legend - positioned on map */}
              <div className="absolute bottom-4 left-4 hidden md:block">
                <MapLegend />
              </div>
            </div>
          </div>

          {/* Mobile Legend */}
          {!isFullscreen && (
            <div className="mt-4 md:hidden">
              <MapLegend />
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-xl text-sm">
              {error}
            </div>
          )}
        </div>
      </main>

      {!isFullscreen && <Footer />}
    </>
  );
}
