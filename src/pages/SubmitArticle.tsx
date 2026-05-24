import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ArticleSubmissionForm } from '@/components/blog/ArticleSubmissionForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Plus, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Eye,
  Edit,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface UserArticle {
  id: string;
  title: string;
  excerpt: string;
  status: string;
  created_at: string;
  published_at: string | null;
  views: number;
  rejection_reason: string | null;
}

export default function SubmitArticle() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState<UserArticle[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      checkAccess();
      fetchUserArticles();
    } else {
      setLoading(false);
    }
  }, [user]);

  async function checkAccess() {
    try {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id);

      const allowedRoles = ['admin', 'writer', 'editor', 'journalist'];
      const hasRole = roles?.some(r => allowedRoles.includes(r.role)) || false;
      setHasAccess(hasRole);
    } catch (error) {
      console.error('Error checking access:', error);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUserArticles() {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('id, title, excerpt, status, created_at, published_at, views, rejection_reason')
        .eq('submitted_by', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      console.error('Error fetching articles:', error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this draft?')) return;
    
    try {
      const { error } = await supabase
        .from('articles')
        .delete()
        .eq('id', id)
        .eq('submitted_by', user?.id);

      if (error) throw error;
      
      toast({ title: 'Deleted', description: 'Article deleted successfully' });
      fetchUserArticles();
    } catch (error) {
      console.error('Error deleting article:', error);
      toast({ title: 'Error', description: 'Failed to delete article', variant: 'destructive' });
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-emerald-500/10 text-emerald-500">Published</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500/10 text-amber-500">Pending Review</Badge>;
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-24 text-center">
          <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Sign In Required</h1>
          <p className="text-muted-foreground mb-6">
            Please sign in to submit articles to Wellington EcoBuild.
          </p>
          <Button onClick={() => navigate('/auth')}>Sign In</Button>
        </div>
        <Footer />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-24 text-center">
          <XCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Contributor Access Required</h1>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Article submission is available to verified contributors only. 
            Contact us to become a contributor and share your expertise with the Wellington EcoBuild community.
          </p>
          <Button variant="outline" onClick={() => navigate('/contact')}>
            Request Contributor Access
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  if (showForm || editingId) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">
                {editingId ? 'Edit Article' : 'Submit New Article'}
              </h1>
              <p className="text-muted-foreground">
                Create professional content for Wellington EcoBuild
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => { setShowForm(false); setEditingId(null); }}
            >
              Cancel
            </Button>
          </div>
          <ArticleSubmissionForm 
            articleId={editingId || undefined}
            onSuccess={() => {
              setShowForm(false);
              setEditingId(null);
              fetchUserArticles();
            }}
          />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">My Articles</h1>
            <p className="text-muted-foreground">
              Manage your submitted articles and drafts
            </p>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Article
          </Button>
        </div>

        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All ({articles.length})</TabsTrigger>
            <TabsTrigger value="published">
              Published ({articles.filter(a => a.status === 'published').length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending ({articles.filter(a => a.status === 'pending').length})
            </TabsTrigger>
            <TabsTrigger value="draft">
              Drafts ({articles.filter(a => a.status === 'draft').length})
            </TabsTrigger>
          </TabsList>

          {['all', 'published', 'pending', 'draft'].map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-6">
              {articles.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-2">No articles yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Start writing your first article for Wellington EcoBuild
                    </p>
                    <Button onClick={() => setShowForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Article
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {articles
                    .filter(a => tab === 'all' || a.status === tab)
                    .map((article) => (
                      <Card key={article.id}>
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                {getStatusBadge(article.status)}
                                {article.status === 'published' && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Eye className="h-3 w-3" />
                                    {article.views} views
                                  </span>
                                )}
                              </div>
                              <h3 className="font-semibold text-lg truncate">
                                {article.title}
                              </h3>
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                {article.excerpt}
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                Created {format(new Date(article.created_at), 'MMM d, yyyy')}
                                {article.published_at && (
                                  <> • Published {format(new Date(article.published_at), 'MMM d, yyyy')}</>
                                )}
                              </p>
                              {article.status === 'rejected' && article.rejection_reason && (
                                <div className="mt-2 p-2 bg-destructive/10 rounded text-sm text-destructive">
                                  <strong>Reason:</strong> {article.rejection_reason}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {(article.status === 'draft' || article.status === 'rejected') && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingId(article.id)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {article.status === 'published' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  asChild
                                >
                                  <a href={`/blog/${article.id}`} target="_blank">
                                    <Eye className="h-4 w-4" />
                                  </a>
                                </Button>
                              )}
                              {article.status === 'draft' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDelete(article.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
      <Footer />
    </div>
  );
}
