import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MessageCircle, Search, Plus, TrendingUp, Clock, 
  CheckCircle, Award, Users, ChevronRight, Flame,
  HelpCircle, Leaf, Home, FileText, DollarSign, Wrench
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ForumCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
}

interface ForumQuestion {
  id: string;
  title: string;
  slug: string;
  content: string;
  tags: string[];
  status: string;
  views: number;
  upvotes: number;
  answer_count: number;
  created_at: string;
  user_id: string;
  category_id: string;
  is_pinned: boolean;
  forum_categories: ForumCategory;
  profiles: { full_name: string } | null;
}

const ICON_MAP: Record<string, any> = {
  "message-circle": MessageCircle,
  search: Search,
  leaf: Leaf,
  home: Home,
  "file-text": FileText,
  "dollar-sign": DollarSign,
  wrench: Wrench,
  award: Award,
};

const Community = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [questions, setQuestions] = useState<ForumQuestion[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [selectedCategory]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch categories
    const { data: cats } = await supabase
      .from("forum_categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    
    if (cats) setCategories(cats);

    // Fetch questions
    let query = supabase
      .from("forum_questions")
      .select("*, forum_categories(*), profiles(full_name)")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);

    if (selectedCategory) {
      query = query.eq("category_id", selectedCategory);
    }

    const { data: qs } = await query;
    if (qs) setQuestions(qs as unknown as ForumQuestion[]);
    
    setLoading(false);
  };

  const filteredQuestions = questions.filter(q => 
    q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const trendingQuestions = [...questions]
    .sort((a, b) => (b.upvotes + b.answer_count * 2) - (a.upvotes + a.answer_count * 2))
    .slice(0, 5);

  return (
    <>
      <Helmet>
        <title>Community Forum | Wellington EcoBuild</title>
        <meta name="description" content="Join Wellington's sustainable building community. Ask questions, share knowledge, and connect with verified professionals." />
      </Helmet>

      <Header />

      <main className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary/10 via-background to-accent/5 py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Users className="w-4 h-4" />
                Wellington's Building Community
              </div>
              <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
                Ask. Learn. <span className="text-gradient">Build Better.</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                Get expert answers from verified professionals and fellow homeowners in Wellington's sustainable building community.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Search questions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 h-12 text-base"
                  />
                </div>
                {user ? (
                  <Button asChild size="lg" className="gap-2">
                    <Link to="/community/ask">
                      <Plus className="w-5 h-5" />
                      Ask a Question
                    </Link>
                  </Button>
                ) : (
                  <Button asChild size="lg" variant="outline" className="gap-2">
                    <Link to="/auth?redirect=/community/ask">
                      Sign in to Ask
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-4 gap-8">
              {/* Sidebar - Categories */}
              <div className="lg:col-span-1 space-y-6">
                <div className="glass rounded-xl p-4">
                  <h3 className="font-semibold mb-4">Categories</h3>
                  <div className="space-y-1">
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        !selectedCategory ? "bg-primary/10 text-primary" : "hover:bg-muted"
                      }`}
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span className="text-sm">All Discussions</span>
                    </button>
                    {categories.map(cat => {
                      const Icon = ICON_MAP[cat.icon] || MessageCircle;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                            selectedCategory === cat.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-sm">{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Trending */}
                <div className="glass rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4 text-accent" />
                    <h3 className="font-semibold">Trending</h3>
                  </div>
                  <div className="space-y-3">
                    {trendingQuestions.map((q, i) => (
                      <Link
                        key={q.id}
                        to={`/community/${q.slug}`}
                        className="block group"
                      >
                        <div className="flex gap-2">
                          <span className="text-xs font-bold text-muted-foreground">{i + 1}</span>
                          <p className="text-sm group-hover:text-primary transition-colors line-clamp-2">
                            {q.title}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {/* Main Content - Questions */}
              <div className="lg:col-span-3">
                <Tabs defaultValue="latest" className="space-y-6">
                  <div className="flex items-center justify-between">
                    <TabsList>
                      <TabsTrigger value="latest" className="gap-2">
                        <Clock className="w-4 h-4" />
                        Latest
                      </TabsTrigger>
                      <TabsTrigger value="unanswered" className="gap-2">
                        <HelpCircle className="w-4 h-4" />
                        Unanswered
                      </TabsTrigger>
                      <TabsTrigger value="hot" className="gap-2">
                        <Flame className="w-4 h-4" />
                        Hot
                      </TabsTrigger>
                    </TabsList>

                    <p className="text-sm text-muted-foreground">
                      {filteredQuestions.length} questions
                    </p>
                  </div>

                  <TabsContent value="latest" className="space-y-4">
                    {loading ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="card-premium p-6 animate-pulse">
                            <div className="h-5 bg-muted rounded w-3/4 mb-3" />
                            <div className="h-4 bg-muted rounded w-1/2" />
                          </div>
                        ))}
                      </div>
                    ) : filteredQuestions.length === 0 ? (
                      <div className="text-center py-12">
                        <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-semibold mb-2">No questions yet</h3>
                        <p className="text-muted-foreground mb-4">Be the first to start a discussion!</p>
                        {user && (
                          <Button asChild>
                            <Link to="/community/ask">Ask a Question</Link>
                          </Button>
                        )}
                      </div>
                    ) : (
                      filteredQuestions.map(question => (
                        <QuestionCard key={question.id} question={question} />
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="unanswered" className="space-y-4">
                    {filteredQuestions.filter(q => q.answer_count === 0).map(question => (
                      <QuestionCard key={question.id} question={question} />
                    ))}
                  </TabsContent>

                  <TabsContent value="hot" className="space-y-4">
                    {trendingQuestions.map(question => (
                      <QuestionCard key={question.id} question={question} />
                    ))}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

const QuestionCard = ({ question }: { question: ForumQuestion }) => {
  const hasAcceptedAnswer = question.status === "answered";

  return (
    <Link
      to={`/community/${question.slug}`}
      className="block card-interactive p-6 group"
    >
      <div className="flex gap-4">
        {/* Stats */}
        <div className="hidden sm:flex flex-col items-center gap-2 text-center min-w-[60px]">
          <div className={`px-3 py-1 rounded-lg text-sm font-medium ${
            hasAcceptedAnswer 
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" 
              : "bg-muted text-muted-foreground"
          }`}>
            {question.answer_count}
            <span className="block text-xs">answers</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {question.upvotes}
            <span className="block text-xs">votes</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-2">
            {question.is_pinned && (
              <Badge variant="secondary" className="shrink-0">Pinned</Badge>
            )}
            {hasAcceptedAnswer && (
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
            )}
            <h3 className="font-semibold group-hover:text-primary transition-colors line-clamp-2">
              {question.title}
            </h3>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {question.content.replace(/<[^>]*>/g, '').slice(0, 200)}...
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {question.forum_categories && (
              <Badge variant="outline" className="text-xs">
                {question.forum_categories.name}
              </Badge>
            )}
            {question.tags?.slice(0, 3).map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            <span className="text-xs text-muted-foreground ml-auto">
              {question.profiles?.full_name || "Anonymous"} · {formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>

        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 self-center" />
      </div>
    </Link>
  );
};

export default Community;
