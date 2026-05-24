import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Building2, Hammer, DollarSign, Users, BarChart3, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface MarketDataItem {
  id: string;
  data_type: string;
  category: string | null;
  suburb: string | null;
  metric_name: string;
  metric_value: number;
  unit: string | null;
  source: string | null;
  is_verified: boolean;
}

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#10b981', '#f59e0b', '#ef4444'];

const MarketData = () => {
  const [marketData, setMarketData] = useState<MarketDataItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMarketData = async () => {
      const { data } = await supabase
        .from('market_data')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (data) setMarketData(data);
      setLoading(false);
    };

    fetchMarketData();
  }, []);

  const buildingConsents = marketData.filter(d => d.data_type === 'building_consents');
  const projectCosts = marketData.filter(d => d.data_type === 'project_costs');
  const materialPrices = marketData.filter(d => d.data_type === 'material_prices');
  const laborRates = marketData.filter(d => d.data_type === 'labor_rates');

  const consentsChartData = buildingConsents.map(d => ({
    name: d.category || 'Other',
    value: d.metric_value,
  }));

  const laborChartData = laborRates.map(d => ({
    name: d.category || d.metric_name.replace('Average Hourly Rate', '').trim(),
    rate: d.metric_value,
  }));

  return (
    <>
      <Helmet>
        <title>Wellington Construction Market Data | Wellington EcoBuild</title>
        <meta name="description" content="Real-time construction market data, building consents, project costs, and labor rates for the Wellington region." />
      </Helmet>

      <Header />

      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">
              <BarChart3 className="h-3 w-3 mr-1" />
              Market Intelligence
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Wellington Construction Market Data
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Real-time insights into building consents, project costs, material prices, and labor rates across the Wellington region.
            </p>
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/20 rounded-lg">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {buildingConsents.reduce((sum, d) => sum + d.metric_value, 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">Monthly Consents</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      ${projectCosts.find(d => d.metric_name.includes('sqm'))?.metric_value?.toLocaleString() || '3,500'}/m²
                    </p>
                    <p className="text-sm text-muted-foreground">Avg Build Cost</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Hammer className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      ${laborRates.find(d => d.category === 'builder')?.metric_value || '85'}/hr
                    </p>
                    <p className="text-sm text-muted-foreground">Builder Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/20 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground flex items-center gap-1">
                      +4.2%
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    </p>
                    <p className="text-sm text-muted-foreground">YoY Growth</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Data Tabs */}
          <Tabs defaultValue="consents" className="space-y-6">
            <TabsList className="grid grid-cols-4 w-full max-w-xl mx-auto">
              <TabsTrigger value="consents">Consents</TabsTrigger>
              <TabsTrigger value="costs">Project Costs</TabsTrigger>
              <TabsTrigger value="materials">Materials</TabsTrigger>
              <TabsTrigger value="labor">Labor Rates</TabsTrigger>
            </TabsList>

            <TabsContent value="consents">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      Building Consents by Type
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={consentsChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {consentsChartData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Consent Data</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {buildingConsents.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-medium text-foreground">{item.metric_name}</p>
                            <p className="text-sm text-muted-foreground">{item.category} - {item.suburb || 'Wellington Region'}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-foreground">{item.metric_value} {item.unit}</p>
                            {item.is_verified && (
                              <Badge variant="secondary" className="text-xs">Verified</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="costs">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-primary" />
                      Average Project Costs
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={projectCosts.map(d => ({ name: d.metric_name.replace('Average ', ''), cost: d.metric_value }))}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                          <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                          <Bar dataKey="cost" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Cost Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {projectCosts.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-medium text-foreground">{item.metric_name}</p>
                            <p className="text-sm text-muted-foreground">{item.category}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-foreground">${item.metric_value.toLocaleString()} {item.unit}</p>
                            {item.source && (
                              <p className="text-xs text-muted-foreground">{item.source}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="materials">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Hammer className="h-5 w-5 text-primary" />
                    Current Material Prices
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {materialPrices.map((item) => (
                      <div key={item.id} className="p-4 bg-muted/50 rounded-lg border">
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-medium text-foreground">{item.metric_name}</p>
                          {item.is_verified && (
                            <Badge variant="secondary" className="text-xs">Verified</Badge>
                          )}
                        </div>
                        <p className="text-2xl font-bold text-primary">${item.metric_value} <span className="text-sm font-normal text-muted-foreground">{item.unit}</span></p>
                        <p className="text-sm text-muted-foreground mt-1">{item.source}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="labor">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Hourly Labor Rates
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={laborChartData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" tickFormatter={(value) => `$${value}`} />
                          <YAxis type="category" dataKey="name" width={100} />
                          <Tooltip formatter={(value: number) => `$${value}/hr`} />
                          <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Rate Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {laborRates.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <Users className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground capitalize">{item.category}</p>
                              <p className="text-sm text-muted-foreground">{item.source}</p>
                            </div>
                          </div>
                          <p className="font-bold text-foreground">${item.metric_value}/hr</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* Data Source Note */}
          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground">
              Data sourced from Stats NZ, industry surveys, and verified supplier information. Updated regularly.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default MarketData;
