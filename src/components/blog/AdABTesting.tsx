import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  FlaskConical, 
  Plus, 
  Play, 
  Pause, 
  CheckCircle, 
  Trash2,
  ArrowUpRight,
  Loader2,
  TrendingUp,
  Zap,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { calculateSignificance, formatConfidence } from '@/lib/statisticalSignificance';

interface ABTest {
  id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'running' | 'paused' | 'completed';
  variant_a: { position: string; format: string };
  variant_b: { position: string; format: string };
  traffic_split: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

interface TestResult {
  test_id: string;
  variant: 'A' | 'B';
  impressions: number;
  clicks: number;
  date: string;
}

const AD_POSITIONS = [
  { value: 'after_first_paragraph', label: 'After First Paragraph' },
  { value: 'mid_article', label: 'Mid Article' },
  { value: 'end_of_article', label: 'End of Article' },
  { value: 'sidebar', label: 'Sidebar' },
];

const AD_FORMATS = [
  { value: 'horizontal', label: 'Horizontal Banner' },
  { value: 'rectangle', label: 'Rectangle' },
  { value: 'vertical', label: 'Vertical' },
  { value: 'responsive', label: 'Responsive' },
];

export function AdABTesting() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTest, setNewTest] = useState({
    name: '',
    description: '',
    variant_a: { position: 'after_first_paragraph', format: 'horizontal' },
    variant_b: { position: 'mid_article', format: 'horizontal' },
    traffic_split: 50,
  });

  // Fetch all A/B tests
  const { data: tests, isLoading } = useQuery({
    queryKey: ['ab-tests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_ab_tests')
        .select('id, name, description, status, variant_a, variant_b, traffic_split, start_date, end_date, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as ABTest[];
    },
  });

  // Fetch aggregated results for all tests
  const { data: results } = useQuery({
    queryKey: ['ab-test-results'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_ab_test_results')
        .select('*');
      if (error) throw error;
      return data as TestResult[];
    },
  });

  // Create test mutation
  const createMutation = useMutation({
    mutationFn: async (test: typeof newTest) => {
      const { error } = await supabase
        .from('ad_ab_tests')
        .insert({
          name: test.name,
          description: test.description || null,
          variant_a: test.variant_a,
          variant_b: test.variant_b,
          traffic_split: test.traffic_split,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ab-tests'] });
      setIsCreateOpen(false);
      setNewTest({
        name: '',
        description: '',
        variant_a: { position: 'after_first_paragraph', format: 'horizontal' },
        variant_b: { position: 'mid_article', format: 'horizontal' },
        traffic_split: 50,
      });
      toast.success('A/B test created');
    },
    onError: () => toast.error('Failed to create test'),
  });

  // Update test status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updateData: Record<string, unknown> = { status };
      if (status === 'running') {
        updateData.start_date = new Date().toISOString();
      } else if (status === 'completed') {
        updateData.end_date = new Date().toISOString();
      }
      const { error } = await supabase
        .from('ad_ab_tests')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ab-tests'] });
      toast.success('Test status updated');
    },
  });

  // Delete test mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ad_ab_tests')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ab-tests'] });
      toast.success('Test deleted');
    },
  });

  const getTestResults = (testId: string) => {
    if (!results) return { a: { impressions: 0, clicks: 0 }, b: { impressions: 0, clicks: 0 } };
    
    const testResults = results.filter(r => r.test_id === testId);
    const aResults = testResults.filter(r => r.variant === 'A');
    const bResults = testResults.filter(r => r.variant === 'B');

    return {
      a: {
        impressions: aResults.reduce((sum, r) => sum + r.impressions, 0),
        clicks: aResults.reduce((sum, r) => sum + r.clicks, 0),
      },
      b: {
        impressions: bResults.reduce((sum, r) => sum + r.impressions, 0),
        clicks: bResults.reduce((sum, r) => sum + r.clicks, 0),
      },
    };
  };

  const calculateCTR = (impressions: number, clicks: number) => {
    if (impressions === 0) return 0;
    return Math.round((clicks / impressions) * 10000) / 100;
  };

  const getSignificanceData = (aResults: { impressions: number; clicks: number }, bResults: { impressions: number; clicks: number }) => {
    return calculateSignificance({
      aImpressions: aResults.impressions,
      aClicks: aResults.clicks,
      bImpressions: bResults.impressions,
      bClicks: bResults.clicks,
    });
  };

  const getWinner = (aResults: { impressions: number; clicks: number }, bResults: { impressions: number; clicks: number }) => {
    const significance = getSignificanceData(aResults, bResults);
    return significance.winner;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge className="bg-emerald-500/10 text-emerald-500">Running</Badge>;
      case 'paused':
        return <Badge className="bg-amber-500/10 text-amber-500">Paused</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500/10 text-blue-500">Completed</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-purple-500" />
            A/B Testing
          </h2>
          <p className="text-sm text-muted-foreground">
            Compare ad placements to find the best performing positions
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Test
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create A/B Test</DialogTitle>
              <DialogDescription>
                Set up a new experiment to compare ad placements
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Test Name</Label>
                <Input
                  placeholder="e.g., Header vs Mid-Article"
                  value={newTest.name}
                  onChange={(e) => setNewTest({ ...newTest, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Textarea
                  placeholder="Describe what you're testing..."
                  value={newTest.description}
                  onChange={(e) => setNewTest({ ...newTest, description: e.target.value })}
                />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label className="text-emerald-500">Variant A</Label>
                  <Select
                    value={newTest.variant_a.position}
                    onValueChange={(v) => setNewTest({ 
                      ...newTest, 
                      variant_a: { ...newTest.variant_a, position: v } 
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Position" />
                    </SelectTrigger>
                    <SelectContent>
                      {AD_POSITIONS.map(pos => (
                        <SelectItem key={pos.value} value={pos.value}>{pos.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={newTest.variant_a.format}
                    onValueChange={(v) => setNewTest({ 
                      ...newTest, 
                      variant_a: { ...newTest.variant_a, format: v } 
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Format" />
                    </SelectTrigger>
                    <SelectContent>
                      {AD_FORMATS.map(fmt => (
                        <SelectItem key={fmt.value} value={fmt.value}>{fmt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label className="text-blue-500">Variant B</Label>
                  <Select
                    value={newTest.variant_b.position}
                    onValueChange={(v) => setNewTest({ 
                      ...newTest, 
                      variant_b: { ...newTest.variant_b, position: v } 
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Position" />
                    </SelectTrigger>
                    <SelectContent>
                      {AD_POSITIONS.map(pos => (
                        <SelectItem key={pos.value} value={pos.value}>{pos.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={newTest.variant_b.format}
                    onValueChange={(v) => setNewTest({ 
                      ...newTest, 
                      variant_b: { ...newTest.variant_b, format: v } 
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Format" />
                    </SelectTrigger>
                    <SelectContent>
                      {AD_FORMATS.map(fmt => (
                        <SelectItem key={fmt.value} value={fmt.value}>{fmt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Traffic Split: {newTest.traffic_split}% A / {100 - newTest.traffic_split}% B</Label>
                <Slider
                  value={[newTest.traffic_split]}
                  onValueChange={([v]) => setNewTest({ ...newTest, traffic_split: v })}
                  min={10}
                  max={90}
                  step={10}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button 
                onClick={() => createMutation.mutate(newTest)}
                disabled={!newTest.name || createMutation.isPending}
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Test
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tests List */}
      {tests && tests.length > 0 ? (
        <div className="space-y-4">
          {tests.map((test) => {
            const testResults = getTestResults(test.id);
            const significance = getSignificanceData(testResults.a, testResults.b);
            const winner = test.status === 'completed' ? significance.winner : null;

            return (
              <Card key={test.id} className={winner ? 'border-emerald-500/30' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                        {test.name}
                        {getStatusBadge(test.status)}
                        {winner && (
                          <Badge className="bg-emerald-500 text-white gap-1">
                            <TrendingUp className="h-3 w-3" />
                            Variant {winner} Wins
                          </Badge>
                        )}
                        {test.status === 'running' && significance.isSignificant && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge className="bg-purple-500/10 text-purple-500 gap-1">
                                  <Zap className="h-3 w-3" />
                                  {formatConfidence(significance.confidence)} Confident
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Will auto-complete at 95%+ confidence</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </CardTitle>
                      {test.description && (
                        <CardDescription>{test.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {test.status === 'draft' && (
                        <Button
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ id: test.id, status: 'running' })}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Start
                        </Button>
                      )}
                      {test.status === 'running' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatusMutation.mutate({ id: test.id, status: 'paused' })}
                          >
                            <Pause className="h-4 w-4 mr-1" />
                            Pause
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => updateStatusMutation.mutate({ id: test.id, status: 'completed' })}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Complete
                          </Button>
                        </>
                      )}
                      {test.status === 'paused' && (
                        <Button
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ id: test.id, status: 'running' })}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Resume
                        </Button>
                      )}
                      {(test.status === 'draft' || test.status === 'completed') && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => deleteMutation.mutate(test.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Variant A */}
                    <div className={`p-4 rounded-lg border ${winner === 'A' ? 'border-emerald-500 bg-emerald-500/5' : 'border-border'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <Badge variant="outline" className="text-emerald-500 border-emerald-500">
                          Variant A ({test.traffic_split}%)
                        </Badge>
                        {winner === 'A' && <ArrowUpRight className="h-4 w-4 text-emerald-500" />}
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {AD_POSITIONS.find(p => p.value === test.variant_a.position)?.label || test.variant_a.position}
                        {' · '}
                        {AD_FORMATS.find(f => f.value === test.variant_a.format)?.label || test.variant_a.format}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-xs text-muted-foreground">Impressions</p>
                          <p className="font-semibold">{testResults.a.impressions.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Clicks</p>
                          <p className="font-semibold">{testResults.a.clicks.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">CTR</p>
                          <p className="font-semibold">{calculateCTR(testResults.a.impressions, testResults.a.clicks)}%</p>
                        </div>
                      </div>
                    </div>

                    {/* Variant B */}
                    <div className={`p-4 rounded-lg border ${winner === 'B' ? 'border-emerald-500 bg-emerald-500/5' : 'border-border'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <Badge variant="outline" className="text-blue-500 border-blue-500">
                          Variant B ({100 - test.traffic_split}%)
                        </Badge>
                        {winner === 'B' && <ArrowUpRight className="h-4 w-4 text-emerald-500" />}
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {AD_POSITIONS.find(p => p.value === test.variant_b.position)?.label || test.variant_b.position}
                        {' · '}
                        {AD_FORMATS.find(f => f.value === test.variant_b.format)?.label || test.variant_b.format}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-xs text-muted-foreground">Impressions</p>
                          <p className="font-semibold">{testResults.b.impressions.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Clicks</p>
                          <p className="font-semibold">{testResults.b.clicks.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">CTR</p>
                          <p className="font-semibold">{calculateCTR(testResults.b.impressions, testResults.b.clicks)}%</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Significance Stats */}
                  {test.status === 'running' && (
                    <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Info className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Statistical Significance</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-muted-foreground">
                            Sample: {significance.sampleSizeReached ? '✓ Reached' : `${Math.min(testResults.a.impressions, testResults.b.impressions)}/${significance.minSampleSize} min`}
                          </span>
                          <span className="text-muted-foreground">
                            Confidence: <span className={significance.confidence >= 95 ? 'text-emerald-500 font-medium' : ''}>
                              {formatConfidence(significance.confidence)}
                            </span>
                          </span>
                          {significance.lift > 0 && (
                            <span className="text-muted-foreground">
                              Lift: <span className="text-emerald-500">+{significance.lift}%</span>
                            </span>
                          )}
                        </div>
                      </div>
                      {significance.confidence >= 90 && significance.confidence < 95 && (
                        <p className="text-xs text-amber-500 mt-2">
                          Approaching significance - test will auto-complete at 95% confidence
                        </p>
                      )}
                    </div>
                  )}

                  {test.start_date && (
                    <p className="text-xs text-muted-foreground mt-3">
                      Started: {format(new Date(test.start_date), 'MMM d, yyyy')}
                      {test.end_date && ` · Ended: ${format(new Date(test.end_date), 'MMM d, yyyy')}`}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FlaskConical className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No A/B Tests Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first test to start comparing ad placements
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Test
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
