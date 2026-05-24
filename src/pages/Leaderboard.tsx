import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Medal, Star, TrendingUp, TrendingDown, Minus, Award, Building2, Users, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LeaderboardEntry {
  id: string;
  business_id: string;
  total_score: number;
  review_score: number;
  response_rate: number;
  projects_completed: number;
  rank_position: number | null;
  rank_change: number;
  badge_level: string;
  business?: {
    id: string;
    name: string;
    category: string;
    rating: number | null;
    review_count: number | null;
    is_verified: boolean;
    images: string[] | null;
    city: string;
  };
}

const BADGE_COLORS = {
  bronze: 'bg-amber-600',
  silver: 'bg-slate-400',
  gold: 'bg-yellow-500',
  platinum: 'bg-gradient-to-r from-purple-500 to-blue-500',
};

const BADGE_ICONS = {
  bronze: Medal,
  silver: Medal,
  gold: Trophy,
  platinum: Award,
};

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data } = await supabase
        .from('expert_leaderboard')
        .select(`
          *,
          business:businesses(id, name, category, rating, review_count, is_verified, images, city)
        `)
        .order('total_score', { ascending: false })
        .limit(50);

      if (data) {
        setLeaderboard(data.filter(entry => entry.business) as LeaderboardEntry[]);
      }
      setLoading(false);
    };

    fetchLeaderboard();
  }, []);

  const filteredLeaderboard = selectedCategory === 'all' 
    ? leaderboard 
    : leaderboard.filter(entry => entry.business?.category === selectedCategory);

  const categories = ['all', ...new Set(leaderboard.map(e => e.business?.category).filter(Boolean))];

  const getRankIcon = (position: number) => {
    if (position === 1) return <Trophy className="h-6 w-6 text-yellow-500" />;
    if (position === 2) return <Medal className="h-6 w-6 text-slate-400" />;
    if (position === 3) return <Medal className="h-6 w-6 text-amber-600" />;
    return <span className="text-lg font-bold text-muted-foreground">#{position}</span>;
  };

  const getRankChange = (change: number) => {
    if (change > 0) return <span className="flex items-center text-green-600 text-sm"><TrendingUp className="h-4 w-4 mr-1" />+{change}</span>;
    if (change < 0) return <span className="flex items-center text-red-600 text-sm"><TrendingDown className="h-4 w-4 mr-1" />{change}</span>;
    return <span className="flex items-center text-muted-foreground text-sm"><Minus className="h-4 w-4 mr-1" />-</span>;
  };

  return (
    <>
      <Helmet>
        <title>Expert Leaderboard | Top Wellington Builders & Contractors | Wellington EcoBuild</title>
        <meta name="description" content="See the top-ranked builders and contractors in Wellington. Rankings based on reviews, response rate, completed projects, and customer satisfaction." />
      </Helmet>

      <Header />

      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Hero */}
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">
              <Trophy className="h-3 w-3 mr-1" />
              Expert Rankings
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Wellington's Top Professionals
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our expert leaderboard ranks professionals based on customer reviews, response rate, completed projects, and overall performance.
            </p>
          </div>

          {/* Top 3 Podium */}
          {!loading && filteredLeaderboard.length >= 3 && (
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              {/* 2nd Place */}
              <div className="order-1 md:order-1 mt-8 md:mt-12">
                <Card className="text-center border-slate-300 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
                  <CardContent className="pt-6">
                    <div className="relative -mt-12 mb-4">
                      <div className="w-20 h-20 mx-auto rounded-full bg-slate-100 border-4 border-slate-300 flex items-center justify-center overflow-hidden">
                        {filteredLeaderboard[1]?.business?.images?.[0] ? (
                          <img src={filteredLeaderboard[1].business.images[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Building2 className="h-8 w-8 text-slate-400" />
                        )}
                      </div>
                      <Medal className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-8 w-8 text-slate-400" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">2nd Place</p>
                    <Link to={`/business/${filteredLeaderboard[1]?.business?.id}`}>
                      <h3 className="font-bold text-foreground hover:text-primary">{filteredLeaderboard[1]?.business?.name}</h3>
                    </Link>
                    <p className="text-2xl font-bold text-primary mt-2">{filteredLeaderboard[1]?.total_score} pts</p>
                  </CardContent>
                </Card>
              </div>

              {/* 1st Place */}
              <div className="order-0 md:order-2">
                <Card className="text-center border-yellow-400 bg-gradient-to-br from-yellow-50 to-white dark:from-yellow-900/20 dark:to-slate-800 shadow-xl">
                  <CardContent className="pt-6">
                    <div className="relative -mt-16 mb-4">
                      <div className="w-24 h-24 mx-auto rounded-full bg-yellow-100 border-4 border-yellow-400 flex items-center justify-center overflow-hidden">
                        {filteredLeaderboard[0]?.business?.images?.[0] ? (
                          <img src={filteredLeaderboard[0].business.images[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Building2 className="h-10 w-10 text-yellow-600" />
                        )}
                      </div>
                      <Trophy className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-10 w-10 text-yellow-500" />
                    </div>
                    <Badge className="bg-yellow-500 mb-2">Champion</Badge>
                    <Link to={`/business/${filteredLeaderboard[0]?.business?.id}`}>
                      <h3 className="font-bold text-lg text-foreground hover:text-primary">{filteredLeaderboard[0]?.business?.name}</h3>
                    </Link>
                    <p className="text-3xl font-bold text-primary mt-2">{filteredLeaderboard[0]?.total_score} pts</p>
                  </CardContent>
                </Card>
              </div>

              {/* 3rd Place */}
              <div className="order-2 md:order-3 mt-8 md:mt-16">
                <Card className="text-center border-amber-600 bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/20 dark:to-slate-800">
                  <CardContent className="pt-6">
                    <div className="relative -mt-10 mb-4">
                      <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 border-4 border-amber-500 flex items-center justify-center overflow-hidden">
                        {filteredLeaderboard[2]?.business?.images?.[0] ? (
                          <img src={filteredLeaderboard[2].business.images[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Building2 className="h-6 w-6 text-amber-600" />
                        )}
                      </div>
                      <Medal className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-6 w-6 text-amber-600" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">3rd Place</p>
                    <Link to={`/business/${filteredLeaderboard[2]?.business?.id}`}>
                      <h3 className="font-bold text-foreground hover:text-primary">{filteredLeaderboard[2]?.business?.name}</h3>
                    </Link>
                    <p className="text-xl font-bold text-primary mt-2">{filteredLeaderboard[2]?.total_score} pts</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-8 justify-center">
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
                className="capitalize"
              >
                {cat === 'all' ? 'All Categories' : cat.replace(/_/g, ' ')}
              </Button>
            ))}
          </div>

          {/* Full Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle>Complete Rankings</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded"></div>
                  ))}
                </div>
              ) : filteredLeaderboard.length === 0 ? (
                <div className="text-center py-12">
                  <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No rankings yet</h3>
                  <p className="text-muted-foreground">Rankings are calculated based on activity and performance.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredLeaderboard.map((entry, index) => (
                    <div key={entry.id} className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                      <div className="w-10 flex justify-center">
                        {getRankIcon(index + 1)}
                      </div>
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                        {entry.business?.images?.[0] ? (
                          <img src={entry.business.images[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <Link to={`/business/${entry.business?.id}`}>
                          <h3 className="font-semibold text-foreground hover:text-primary flex items-center gap-2">
                            {entry.business?.name}
                            {entry.business?.is_verified && <Shield className="h-4 w-4 text-green-600" />}
                          </h3>
                        </Link>
                        <p className="text-sm text-muted-foreground capitalize">
                          {entry.business?.category.replace(/_/g, ' ')} • {entry.business?.city}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        <span className="text-sm">{entry.business?.rating?.toFixed(1) || '5.0'}</span>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Response</p>
                        <p className="font-semibold text-foreground">{entry.response_rate}%</p>
                      </div>
                      <div className="w-16 text-center">
                        {getRankChange(entry.rank_change)}
                      </div>
                      <div className="text-right">
                        <Badge className={`${BADGE_COLORS[entry.badge_level as keyof typeof BADGE_COLORS]} capitalize`}>
                          {entry.badge_level}
                        </Badge>
                        <p className="text-lg font-bold text-primary mt-1">{entry.total_score} pts</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* How Rankings Work */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>How Rankings Work</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Star className="h-6 w-6 text-primary" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-1">Customer Reviews</h4>
                  <p className="text-sm text-muted-foreground">Quality and quantity of reviews from verified customers</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-1">Response Rate</h4>
                  <p className="text-sm text-muted-foreground">How quickly and consistently you respond to inquiries</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-1">Completed Projects</h4>
                  <p className="text-sm text-muted-foreground">Track record of successfully completed projects</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-1">Verification Status</h4>
                  <p className="text-sm text-muted-foreground">Business verification and certification credentials</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default Leaderboard;
