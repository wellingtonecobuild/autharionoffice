import { CheckCircle2, Star, Sparkles } from 'lucide-react';

export function MapLegend() {
  return (
    <div className="bg-card/95 backdrop-blur-sm border border-border rounded-xl p-4 shadow-lg">
      <h4 className="text-sm font-medium mb-3">Map Legend</h4>
      
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 text-xs">
          <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
            <Sparkles className="w-2.5 h-2.5 text-primary-foreground" />
          </div>
          <span>Featured / Spotlight</span>
        </div>
        
        <div className="flex items-center gap-2 text-xs">
          <div className="w-4 h-4 rounded-full bg-accent flex items-center justify-center">
            <Star className="w-2.5 h-2.5 text-accent-foreground" />
          </div>
          <span>Elite Listing</span>
        </div>
        
        <div className="flex items-center gap-2 text-xs">
          <div className="w-4 h-4 rounded-full bg-secondary border border-border flex items-center justify-center">
            <CheckCircle2 className="w-2.5 h-2.5 text-foreground" />
          </div>
          <span>Verified Professional</span>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-4 h-4 rounded-full bg-muted border border-border" />
          <span>Standard Listing</span>
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-border">
        <p className="text-xs text-muted-foreground italic">
          Click pins to view business details
        </p>
      </div>
    </div>
  );
}
