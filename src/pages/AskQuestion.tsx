import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, X, Send, Loader2 } from "lucide-react";

interface ForumCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
}

const AskQuestion = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      navigate("/auth?redirect=/community/ask");
      return;
    }
    fetchCategories();
  }, [user, navigate]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("forum_categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    
    if (data) setCategories(data);
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 100) + '-' + Date.now().toString(36);
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (newTag && !tags.includes(newTag) && tags.length < 5) {
        setTags([...tags, newTag]);
        setTagInput("");
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error("Please enter a question title");
      return;
    }
    if (!content.trim()) {
      toast.error("Please provide more details about your question");
      return;
    }
    if (!categoryId) {
      toast.error("Please select a category");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("forum_questions")
        .insert({
          title: title.trim(),
          content: content.trim(),
          slug: generateSlug(title),
          category_id: categoryId,
          tags: tags,
          user_id: user!.id,
          status: "open",
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Question posted successfully!");
      navigate(`/community/${data.slug}`);
    } catch (error: any) {
      console.error("Error posting question:", error);
      toast.error(error.message || "Failed to post question");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <Helmet>
        <title>Ask a Question | Community Forum | Wellington EcoBuild</title>
        <meta name="description" content="Ask your building and renovation questions to Wellington's sustainable construction community." />
      </Helmet>

      <Header />

      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <Button
            variant="ghost"
            onClick={() => navigate("/community")}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Community
          </Button>

          <div className="glass rounded-xl p-6 md:p-8">
            <h1 className="text-2xl font-display font-bold mb-2">Ask a Question</h1>
            <p className="text-muted-foreground mb-8">
              Get answers from verified professionals and the community
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Question Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., What's the best insulation for a 1930s Wellington villa?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-12"
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground">
                  Be specific and imagine you're asking another person
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Details *</Label>
                <Textarea
                  id="content"
                  placeholder="Provide context, what you've tried, and any specific requirements..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[200px]"
                />
                <p className="text-xs text-muted-foreground">
                  Include all the information someone would need to answer your question
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags (optional)</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <Input
                  id="tags"
                  placeholder="Type a tag and press Enter (max 5)"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  disabled={tags.length >= 5}
                />
                <p className="text-xs text-muted-foreground">
                  Add up to 5 tags to help others find your question
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/community")}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Post Question
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default AskQuestion;
