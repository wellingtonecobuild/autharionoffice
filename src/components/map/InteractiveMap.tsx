import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapBusiness } from '@/hooks/useMapBusinesses';
import { createRoot } from 'react-dom/client';
import { BusinessPopup } from './BusinessPopup';
import { Loader2 } from 'lucide-react';

interface InteractiveMapProps {
  businesses: MapBusiness[];
  loading: boolean;
  mapboxToken: string;
}

// Wellington region bounds
const WELLINGTON_BOUNDS: [[number, number], [number, number]] = [
  [174.6, -41.5], // Southwest
  [175.5, -40.8], // Northeast
];

const WELLINGTON_CENTER: [number, number] = [174.85, -41.25];

const categoryColors: Record<string, string> = {
  'eco-builders': '#166534', // green-800
  'suppliers': '#1e40af', // blue-800
  'architects': '#7c2d12', // orange-900
  'renovation': '#581c87', // purple-900
};

export function InteractiveMap({ businesses, loading, mapboxToken }: InteractiveMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const popup = useRef<mapboxgl.Popup | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: WELLINGTON_CENTER,
      zoom: 10,
      maxBounds: WELLINGTON_BOUNDS,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: false }),
      'top-right'
    );

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    return () => {
      markers.current.forEach((m) => m.remove());
      markers.current = [];
      popup.current?.remove();
      map.current?.remove();
    };
  }, [mapboxToken]);

  // Update markers when businesses change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    markers.current.forEach((m) => m.remove());
    markers.current = [];
    popup.current?.remove();

    // Add new markers
    businesses.forEach((business) => {
      if (!business.latitude || !business.longitude) return;

      // Create marker element
      const el = document.createElement('div');
      el.className = 'map-marker';
      
      const isSpotlight = business.pin_priority === 'spotlight';
      const isFeatured = business.pin_priority === 'featured';
      const isElite = business.subscription_plan === 'elite';
      const isVerified = business.is_verified;

      // Determine marker size and style
      let size = 28;
      let borderWidth = 2;
      let zIndex = 1;
      
      if (isSpotlight) {
        size = 40;
        borderWidth = 3;
        zIndex = 100;
      } else if (isFeatured || isElite) {
        size = 34;
        zIndex = 50;
      }

      const bgColor = categoryColors[business.category] || '#1f2937';
      
      el.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        background-color: ${bgColor};
        border: ${borderWidth}px solid ${isSpotlight ? '#f59e0b' : isVerified ? '#14b8a6' : 'white'};
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        z-index: ${zIndex};
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s ease;
      `;

      // Add icon based on priority
      // SECURITY: Only static SVG strings are used here - never include user data in innerHTML
      // These are hardcoded icons, not user-controlled content
      if (isSpotlight) {
        const starIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        starIcon.setAttribute('width', '16');
        starIcon.setAttribute('height', '16');
        starIcon.setAttribute('viewBox', '0 0 24 24');
        starIcon.setAttribute('fill', 'white');
        const starPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        starPath.setAttribute('d', 'M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z');
        starIcon.appendChild(starPath);
        el.appendChild(starIcon);
      } else if (isVerified) {
        const checkIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        checkIcon.setAttribute('width', '12');
        checkIcon.setAttribute('height', '12');
        checkIcon.setAttribute('viewBox', '0 0 24 24');
        checkIcon.setAttribute('fill', 'white');
        const checkPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        checkPath.setAttribute('d', 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z');
        checkIcon.appendChild(checkPath);
        el.appendChild(checkIcon);
      }

      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.15)';
      });
      
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
      });

      // Create marker
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([business.longitude, business.latitude])
        .addTo(map.current!);

      // Click handler for popup
      el.addEventListener('click', () => {
        popup.current?.remove();

        const popupContainer = document.createElement('div');
        const root = createRoot(popupContainer);
        root.render(
          <BusinessPopup 
            business={business} 
            onClose={() => popup.current?.remove()} 
          />
        );

        popup.current = new mapboxgl.Popup({
          closeButton: true,
          closeOnClick: false,
          offset: 25,
          maxWidth: 'none',
        })
          .setLngLat([business.longitude, business.latitude])
          .setDOMContent(popupContainer)
          .addTo(map.current!);
      });

      markers.current.push(marker);
    });

    // Fit bounds to show all markers if there are any
    if (businesses.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      businesses.forEach((b) => {
        if (b.longitude && b.latitude) {
          bounds.extend([b.longitude, b.latitude]);
        }
      });
      
      if (!bounds.isEmpty()) {
        map.current.fitBounds(bounds, { 
          padding: 60,
          maxZoom: 13,
        });
      }
    }
  }, [businesses, mapLoaded]);

  if (!mapboxToken) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted rounded-xl">
        <p className="text-muted-foreground text-sm">Map token not configured</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0 rounded-xl overflow-hidden" />
      
      {(loading || !mapLoaded) && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading map...</span>
          </div>
        </div>
      )}

      {mapLoaded && businesses.length === 0 && !loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-card/95 backdrop-blur-sm border border-border rounded-xl px-6 py-4 shadow-lg">
            <p className="text-muted-foreground text-sm">No listings match your filters</p>
          </div>
        </div>
      )}
    </div>
  );
}
