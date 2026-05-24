import { useMemo } from 'react';
import { Megaphone, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AdPreviewPlaceholderProps {
  position: 'after_first_paragraph' | 'mid_article' | 'end_of_article' | 'sidebar';
  adNumber?: number;
}

const POSITION_LABELS = {
  after_first_paragraph: 'After First Paragraph',
  mid_article: 'Mid-Article',
  end_of_article: 'End of Article',
  sidebar: 'Sidebar (Desktop)',
};

export function AdPreviewPlaceholder({ position, adNumber }: AdPreviewPlaceholderProps) {
  return (
    <div className="border-2 border-dashed border-amber-500/50 bg-amber-500/5 rounded-lg p-4 my-4">
      <div className="flex items-center justify-center gap-2 text-amber-600">
        <Megaphone className="h-4 w-4" />
        <span className="text-sm font-medium">
          Ad Placement: {POSITION_LABELS[position]}
          {adNumber && ` #${adNumber}`}
        </span>
      </div>
    </div>
  );
}

interface ArticleAdPreviewProps {
  content: string;
  adsEnabled: boolean;
  adFrequency?: number;
  maxAds?: number;
}

export function ArticleAdPreview({ 
  content, 
  adsEnabled, 
  adFrequency = 5,
  maxAds = 3 
}: ArticleAdPreviewProps) {
  const preview = useMemo(() => {
    if (!adsEnabled || !content.trim()) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
          <p>{!adsEnabled ? 'Ads are disabled for this article' : 'Enter content to see ad preview'}</p>
        </div>
      );
    }

    const lines = content.split('\n').filter(line => line.trim());
    const elements: React.ReactNode[] = [];
    let paragraphCount = 0;
    let adCount = 0;

    // Add after first paragraph ad
    elements.push(
      <AdPreviewPlaceholder key="ad-top" position="after_first_paragraph" />
    );

    lines.forEach((line, i) => {
      // Skip headings, lists, quotes for ad placement counting
      const isHeading = line.startsWith('#');
      const isList = line.startsWith('-') || line.match(/^\d+\./);
      const isQuote = line.startsWith('>');
      
      if (isHeading) {
        elements.push(
          <p key={i} className="font-semibold text-sm text-muted-foreground mt-4 mb-2">
            {line.replace(/^#+\s*/, '')}
          </p>
        );
      } else if (line.trim()) {
        paragraphCount++;
        elements.push(
          <p key={i} className="text-sm text-muted-foreground mb-2 line-clamp-2">
            {line.slice(0, 100)}{line.length > 100 ? '...' : ''}
          </p>
        );

        // Check if we should insert an inline ad
        if (paragraphCount > 0 && paragraphCount % adFrequency === 0 && adCount < maxAds - 2) {
          adCount++;
          elements.push(
            <AdPreviewPlaceholder key={`ad-inline-${adCount}`} position="mid_article" adNumber={adCount} />
          );
        }
      }
    });

    // Add end of article ad
    elements.push(
      <AdPreviewPlaceholder key="ad-bottom" position="end_of_article" />
    );

    return elements;
  }, [content, adsEnabled, adFrequency, maxAds]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-sm">Ad Placement Preview</h4>
        <Badge variant={adsEnabled ? "default" : "secondary"}>
          {adsEnabled ? 'Ads Enabled' : 'Ads Disabled'}
        </Badge>
      </div>
      <div className="max-h-[400px] overflow-y-auto border border-border rounded-lg p-4 bg-muted/30">
        {preview}
      </div>
      <p className="text-xs text-muted-foreground">
        This preview shows approximate ad positions. Actual placement may vary based on content structure.
      </p>
    </div>
  );
}
