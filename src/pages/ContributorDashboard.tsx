import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Plus,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  PenLine,
  TrendingUp,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  status: string;
  views: number;
  created_at: string;
  published_at: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  categories: string[];
  word_count: number | null;
}

const ContributorDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("all");

  const { data: articles, isLoading } = useQuery({
    queryKey: ["contributor-articles", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("articles")
        .select("id, title, slug, excerpt, status, views, created_at, published_at, reviewed_at, rejection_reason, categories, word_count")
        .eq("submitted_by", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Article[];
    },
    enabled: !!user?.id,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-5xl">
            <Skeleton className="h-10 w-64 mb-4" />
            <Skeleton className="h-6 w-96 mb-8" />
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const filteredArticles = articles?.filter((a) => {
    if (activeTab === "all") return true;
    return a.status === activeTab;
  });

  const stats = {
    total: articles?.length || 0,
    published: articles?.filter((a) => a.status === "published").length || 0,
    pending: articles?.filter((a) => a.status === "pending").length || 0,
    draft: articles?.filter((a) => a.status === "draft").length || 0,
    rejected: articles?.filter((a) => a.status === "rejected").length || 0,
    totalViews: articles?.reduce((sum, a) => sum + (a.views || 0), 0) || 0,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Published
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
            <Clock className="w-3 h-3 mr-1" />
            Pending Review
          </Badge>
        );
      case "draft":
        return (
          <Badge variant="secondary">
            <PenLine className="w-3 h-3 mr-1" />
            Draft
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-destructive/10 text-destructive border-destructive/20">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Contributor Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Manage your article submissions and track their status
              </p>
            </div>
            <Button asChild>
              <Link to="/submit-article">
                <Plus className="w-4 h-4 mr-2" />
                Submit New Article
              </Link>
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <FileText className="w-4 h-4" />
                  <span className="text-xs">Total</span>
                </div>
                <p className="text-2xl font-bold">{stats.total}</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-500/30">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 text-emerald-600 mb-1">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-xs">Published</span>
                </div>
                <p className="text-2xl font-bold text-emerald-600">{stats.published}</p>
              </CardContent>
            </Card>
            <Card className="border-amber-500/30">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 text-amber-600 mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs">Pending</span>
                </div>
                <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <PenLine className="w-4 h-4" />
                  <span className="text-xs">Drafts</span>
                </div>
                <p className="text-2xl font-bold">{stats.draft}</p>
              </CardContent>
            </Card>
            <Card className="border-destructive/30">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 text-destructive mb-1">
                  <XCircle className="w-4 h-4" />
                  <span className="text-xs">Rejected</span>
                </div>
                <p className="text-2xl font-bold text-destructive">{stats.rejected}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs">Total Views</span>
                </div>
                <p className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>

          {/* Articles List */}
          <Card>
            <CardHeader>
              <CardTitle>Your Articles</CardTitle>
              <CardDescription>
                View and manage all your submitted articles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
                  <TabsTrigger value="published">Published ({stats.published})</TabsTrigger>
                  <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
                  <TabsTrigger value="draft">Drafts ({stats.draft})</TabsTrigger>
                  <TabsTrigger value="rejected">Rejected ({stats.rejected})</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-0">
                  {isLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-24 w-full" />
                      ))}
                    </div>
                  ) : filteredArticles?.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">No articles found</p>
                      <p className="text-sm mt-1">
                        {activeTab === "all"
                          ? "Start by submitting your first article"
                          : `You don't have any ${activeTab} articles`}
                      </p>
                      {activeTab === "all" && (
                        <Button asChild className="mt-4">
                          <Link to="/submit-article">
                            <Plus className="w-4 h-4 mr-2" />
                            Submit Article
                          </Link>
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredArticles?.map((article) => (
                        <div
                          key={article.id}
                          className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {getStatusBadge(article.status)}
                                {article.word_count && (
                                  <span className="text-xs text-muted-foreground">
                                    {article.word_count} words
                                  </span>
                                )}
                              </div>
                              <h3 className="font-semibold text-foreground truncate">
                                {article.title}
                              </h3>
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                {article.excerpt}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {format(new Date(article.created_at), "MMM d, yyyy")}
                                </span>
                                {article.status === "published" && (
                                  <span className="flex items-center gap-1">
                                    <Eye className="w-3 h-3" />
                                    {article.views} views
                                  </span>
                                )}
                              </div>
                              {article.status === "rejected" && article.rejection_reason && (
                                <div className="mt-3 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                                  <div className="flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="text-sm font-medium text-destructive">
                                        Rejection Reason
                                      </p>
                                      <p className="text-sm text-muted-foreground mt-1">
                                        {article.rejection_reason}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 sm:flex-shrink-0">
                              {article.status === "published" ? (
                                <Button variant="outline" size="sm" asChild>
                                  <Link to={`/news/${article.slug}`}>
                                    <Eye className="w-4 h-4 mr-1" />
                                    View
                                  </Link>
                                </Button>
                              ) : article.status === "draft" || article.status === "rejected" ? (
                                <Button variant="outline" size="sm" asChild>
                                  <Link to={`/submit-article?edit=${article.id}`}>
                                    <PenLine className="w-4 h-4 mr-1" />
                                    Edit
                                  </Link>
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Quick Tips */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Writing Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>Focus on Wellington's sustainable building industry with relevant, timely content</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>Include high-quality images with proper credits</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>Add relevant hashtags for better discoverability</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>Write clear SEO meta descriptions to improve search visibility</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ContributorDashboard;
