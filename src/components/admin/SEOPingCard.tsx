import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Loader2, CheckCircle2, ExternalLink, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PingResult {
  url: string;
  status: string;
  engine: string;
}

interface LastPingData {
  timestamp: string;
  articles_count: number;
  ping_results: PingResult[];
}

export function SEOPingCard() {
  const [pinging, setPinging] = useState(false);
  const [lastPing, setLastPing] = useState<LastPingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLastPing();
  }, []);

  const fetchLastPing = async () => {
    try {
      const { data } = await supabase
        .from('admin_notifications')
        .select('metadata, created_at')
        .eq('type', 'seo_ping')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (data?.metadata) {
        const metadata = data.metadata as Record<string, unknown>;
        setLastPing({
          timestamp: metadata.timestamp as string || data.created_at,
          articles_count: metadata.total_articles as number || 0,
          ping_results: (metadata.ping_results as PingResult[]) || []
        });
      }
    } catch (error) {
      console.log('No previous ping data found');
    } finally {
      setLoading(false);
    }
  };

  const handlePing = async () => {
    setPinging(true);
    try {
      const { data, error } = await supabase.functions.invoke('ping-search-engines');
      
      if (error) throw error;
      
      toast.success(`Pinged ${data.articles_count} articles to Google & Bing!`);
      setLastPing({
        timestamp: data.timestamp,
        articles_count: data.articles_count,
        ping_results: data.ping_results || []
      });
    } catch (error: unknown) {
      console.error('Ping error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Failed to ping search engines: ' + errorMessage);
    } finally {
      setPinging(false);
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-NZ', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  return (
    <Card className="border-orange-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5 text-orange-500" />
          SEO Domination
        </CardTitle>
        <CardDescription>
          Ping Google & Bing daily to ensure all blog posts appear in search results.
          Runs automatically every day at 6am NZ time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Manual Ping</p>
            <p className="text-xs text-muted-foreground">
              Immediately notify search engines about your content
            </p>
          </div>
          <Button 
            onClick={handlePing}
            disabled={pinging}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {pinging ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Pinging...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Ping Now
              </>
            )}
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading last ping data...
          </div>
        ) : lastPing ? (
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Last ping:</span>
              <span className="font-medium">{formatDate(lastPing.timestamp)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>{lastPing.articles_count} articles pinged</span>
            </div>
            {lastPing.ping_results.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {lastPing.ping_results.map((result, index) => (
                  <Badge 
                    key={index} 
                    variant={result.status === 'success' ? 'default' : 'destructive'}
                    className="text-xs"
                  >
                    {result.engine}: {result.status}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No ping data yet. Click "Ping Now" to start.</p>
        )}

        <div className="flex gap-2 text-xs text-muted-foreground">
          <a 
            href="https://wellingtonecobuild.co.nz/sitemap.xml" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-foreground"
          >
            <ExternalLink className="h-3 w-3" />
            View Sitemap
          </a>
          <span>•</span>
          <a 
            href="https://search.google.com/search-console" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-foreground"
          >
            <ExternalLink className="h-3 w-3" />
            Google Search Console
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
