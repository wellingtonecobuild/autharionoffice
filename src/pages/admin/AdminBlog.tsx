import { useState, useCallback, useEffect } from "react";
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  Star,
  TrendingUp,
  Pin,
  Search,
  FileText,
  Hash,
  Video,
  Image,
  Link2,
  X,
  Megaphone,
  Check,
  XCircle,
  Clock,
  AlertCircle,
  Globe,
  MapPin,
  BarChart3,
} from "lucide-react";
import { format } from "date-fns";
import { ArticleAdPreview } from "@/components/blog/ArticleAdPreview";
import { BlogAnalyticsPanel } from "@/components/admin/BlogAnalyticsPanel";
import { sendArticleStatusEmail } from "@/lib/emailService";

// Page title for admin panel
const PAGE_TITLE = "Market Insights";

type BlogCategory = 
  | "wellington_construction_news"
  | "sustainable_building"
  | "supplier_updates"
  | "projects_developments"
  | "renovation_retrofit"
  | "regulations_compliance"
  | "market_trends"
  | "eco_building_education"
  | "construction_opportunities"
  | "finance_construction";

const CATEGORY_LABELS: Record<BlogCategory, string> = {
  wellington_construction_news: "Wellington Construction News",
  sustainable_building: "Sustainable Building & Materials",
  supplier_updates: "Supplier & Industry Updates",
  projects_developments: "Projects & Developments",
  renovation_retrofit: "Renovation & Retrofit",
  regulations_compliance: "Regulations & Compliance",
  market_trends: "Market Trends & Cost Insights",
  eco_building_education: "Eco-Building Education",
  construction_opportunities: "Construction Opportunities",
  finance_construction: "Finance for Construction",
};

const CATEGORIES: BlogCategory[] = [
  "wellington_construction_news",
  "sustainable_building",
  "supplier_updates",
  "projects_developments",
  "renovation_retrofit",
  "regulations_compliance",
  "market_trends",
  "eco_building_education",
  "construction_opportunities",
  "finance_construction",
];

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image: string | null;
  subtitle: string | null;
  gallery_images: string[] | null;
  video_url: string | null;
  image_caption: string | null;
  image_credit: string | null;
  categories: BlogCategory[];
  tags: string[] | null;
  author: string;
  author_avatar: string | null;
  is_featured: boolean;
  is_trending: boolean;
  is_pinned: boolean;
  ads_enabled: boolean;
  views: number;
  word_count: number | null;
  meta_title: string | null;
  meta_description: string | null;
  published_at: string | null;
  status: string;
  created_at: string;
  submitted_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  location_scope: 'wellington' | 'national_nz' | null;
  call_to_action: {
    text?: string;
    link?: string;
    label?: string;
  } | null;
}

const AdminBlog = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [selectedArticleForRejection, setSelectedArticleForRejection] = useState<Article | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    featured_image: "",
    video_url: "",
    image_caption: "",
    image_credit: "",
    categories: [] as BlogCategory[],
    tags: [] as string[],
    author: "Wellington EcoBuild",
    is_featured: false,
    is_trending: false,
    is_pinned: false,
    ads_enabled: true,
    meta_title: "",
    meta_description: "",
    status: "draft",
    published_at: "",
    cta_text: "",
    cta_link: "",
    cta_label: "",
    location_scope: "national_nz" as 'wellington' | 'national_nz',
  });

  const { data: articles, isLoading, refetch } = useQuery({
    queryKey: ["admin-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Article[];
    },
  });

  // Auto-refresh every 5 seconds
  useAutoRefresh(useCallback(async () => { await refetch(); }, [refetch]));

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      const articleData = {
        title: data.title,
        slug: data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
        excerpt: data.excerpt,
        content: data.content,
        featured_image: data.featured_image || null,
        video_url: data.video_url || null,
        image_caption: data.image_caption || null,
        image_credit: data.image_credit || null,
        categories: data.categories,
        tags: data.tags.length > 0 ? data.tags : null,
        author: data.author,
        is_featured: data.is_featured,
        is_trending: data.is_trending,
        is_pinned: data.is_pinned,
        ads_enabled: data.ads_enabled,
        meta_title: data.meta_title || null,
        meta_description: data.meta_description || null,
        status: data.status,
        published_at: data.status === "published" && data.published_at 
          ? new Date(data.published_at).toISOString() 
          : data.status === "published" 
            ? new Date().toISOString() 
            : null,
        call_to_action: data.cta_text ? {
          text: data.cta_text,
          link: data.cta_link,
          label: data.cta_label || "Learn More",
        } : {},
        location_scope: data.location_scope,
      };

      if (data.id) {
        const { error } = await supabase
          .from("articles")
          .update(articleData)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("articles")
          .insert(articleData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-articles"] });
      setDialogOpen(false);
      resetForm();
      toast({
        title: editingArticle ? "Article updated" : "Article created",
        description: "Changes saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (article: Article) => {
      const { error } = await supabase
        .from("articles")
        .update({ 
          status: "published",
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          published_at: new Date().toISOString(),
        })
        .eq("id", article.id);
      if (error) throw error;
      
      // Send branded approval email to contributor
      if (article.submitted_by) {
        const { data: submitter } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", article.submitted_by)
          .single();
        
        if (submitter?.email) {
          await sendArticleStatusEmail(
            submitter.email,
            article.title,
            'approved',
            submitter.full_name || undefined,
            undefined,
            `${window.location.origin}/blog/${article.slug}`
          );
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-articles"] });
      toast({
        title: "Article approved",
        description: "The article has been published and the contributor notified.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });


  const rejectMutation = useMutation({
    mutationFn: async ({ article, reason }: { article: Article; reason: string }) => {
      const { error } = await supabase
        .from("articles")
        .update({ 
          status: "rejected",
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq("id", article.id);
      if (error) throw error;
      
      // Send branded rejection email to contributor
      if (article.submitted_by) {
        const { data: submitter } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", article.submitted_by)
          .single();
        
        if (submitter?.email) {
          await sendArticleStatusEmail(
            submitter.email,
            article.title,
            'rejected',
            submitter.full_name || undefined,
            reason
          );
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-articles"] });
      setRejectionDialogOpen(false);
      setSelectedArticleForRejection(null);
      setRejectionReason("");
      toast({
        title: "Article rejected",
        description: "The contributor has been notified via email.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("articles")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-articles"] });
      toast({
        title: "Article deleted",
        description: "The article has been removed.",
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: boolean }) => {
      const { error } = await supabase
        .from("articles")
        .update({ [field]: value })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-articles"] });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      featured_image: "",
      video_url: "",
      image_caption: "",
      image_credit: "",
      categories: [],
      tags: [],
      author: "Wellington EcoBuild",
      is_featured: false,
      is_trending: false,
      is_pinned: false,
      ads_enabled: true,
      meta_title: "",
      meta_description: "",
      status: "draft",
      published_at: "",
      cta_text: "",
      cta_link: "",
      cta_label: "",
      location_scope: "national_nz",
    });
    setTagInput("");
    setEditingArticle(null);
  };

  const handleEdit = (article: Article) => {
    setEditingArticle(article);
    setFormData({
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      content: article.content,
      featured_image: article.featured_image || "",
      video_url: article.video_url || "",
      image_caption: article.image_caption || "",
      image_credit: article.image_credit || "",
      categories: article.categories,
      tags: article.tags || [],
      author: article.author,
      is_featured: article.is_featured,
      is_trending: article.is_trending,
      is_pinned: article.is_pinned,
      ads_enabled: article.ads_enabled,
      meta_title: article.meta_title || "",
      meta_description: article.meta_description || "",
      status: article.status,
      published_at: article.published_at ? format(new Date(article.published_at), "yyyy-MM-dd'T'HH:mm") : "",
      cta_text: article.call_to_action?.text || "",
      cta_link: article.call_to_action?.link || "",
      cta_label: article.call_to_action?.label || "",
      location_scope: article.location_scope || "national_nz",
    });
    setDialogOpen(true);
  };

  const handleCategoryToggle = (cat: BlogCategory) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat],
    }));
  };

  const handleAddTag = () => {
    const tag = tagInput.trim().replace(/^#/, "");
    if (tag && !formData.tags.includes(tag)) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tag],
      }));
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const filteredArticles = articles?.filter((a) => {
    const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingArticles = articles?.filter((a) => a.status === "pending");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return <Badge className="bg-emerald-500/10 text-emerald-500">Published</Badge>;
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "pending":
        return <Badge className="bg-amber-500/10 text-amber-500">Pending Review</Badge>;
      case "rejected":
        return <Badge className="bg-destructive/10 text-destructive">Rejected</Badge>;
      case "archived":
        return <Badge variant="outline">Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AdminLayout title={PAGE_TITLE}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              {PAGE_TITLE}
            </h1>
            <p className="text-muted-foreground">Professional insights for Wellington's construction industry</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Article
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingArticle ? "Edit Article" : "Create Article"}</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveMutation.mutate(editingArticle ? { ...formData, id: editingArticle.id } : formData);
                }}
                className="space-y-6"
              >
                <Tabs defaultValue="content" className="w-full">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="content">Content</TabsTrigger>
                    <TabsTrigger value="media">Media</TabsTrigger>
                    <TabsTrigger value="seo">SEO & Tags</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                    <TabsTrigger value="ads">Ad Preview</TabsTrigger>
                  </TabsList>

                  {/* Content Tab */}
                  <TabsContent value="content" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Title *</Label>
                        <Input
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          placeholder="Article title"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Slug (URL)</Label>
                        <Input
                          value={formData.slug}
                          onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                          placeholder="auto-generated-from-title"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Excerpt *</Label>
                      <Textarea
                        value={formData.excerpt}
                        onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                        rows={2}
                        placeholder="Brief summary shown in article previews"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Content *</Label>
                      <Textarea
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        rows={16}
                        placeholder="Article content (Markdown supported: ## Headings, **bold**, - lists, > quotes, [links](url))"
                        className="font-mono text-sm"
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Supports: ## H2, ### H3, **bold**, - bullet lists, 1. numbered lists, {">"} blockquotes, [link text](url)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Author</Label>
                      <Input
                        value={formData.author}
                        onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                        placeholder="Author name"
                      />
                    </div>
                  </TabsContent>

                  {/* Media Tab */}
                  <TabsContent value="media" className="space-y-4 mt-4">
                    <div className="space-y-4">
                      {/* Featured Image with Upload */}
                      <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                          <Image className="w-4 h-4" />
                          Featured Image
                        </Label>

                        {formData.featured_image ? (
                          <div className="relative">
                            <img
                              src={formData.featured_image}
                              alt="Featured image preview"
                              className="h-40 w-full object-cover rounded-lg border"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 h-8 w-8"
                              onClick={() => setFormData({ ...formData, featured_image: "" })}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3">
                            <div className="flex gap-2">
                              <label className="flex-1">
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    if (!file.type.startsWith("image/")) {
                                      toast({ title: "Error", description: "Please select an image file", variant: "destructive" });
                                      return;
                                    }
                                    if (file.size > 5 * 1024 * 1024) {
                                      toast({ title: "Error", description: "Image must be less than 5MB", variant: "destructive" });
                                      return;
                                    }
                                    try {
                                      const fileExt = file.name.split(".").pop();
                                      const fileName = `article-${Date.now()}.${fileExt}`;
                                      const filePath = `articles/${fileName}`;
                                      const { error: uploadError } = await supabase.storage
                                        .from("business-images")
                                        .upload(filePath, file, { cacheControl: "3600", upsert: false });
                                      if (uploadError) throw uploadError;
                                      const { data: { publicUrl } } = supabase.storage
                                        .from("business-images")
                                        .getPublicUrl(filePath);
                                      setFormData({ ...formData, featured_image: publicUrl });
                                      toast({ title: "Success", description: "Image uploaded successfully" });
                                    } catch (err: any) {
                                      toast({ title: "Error", description: err.message || "Failed to upload image", variant: "destructive" });
                                    }
                                  }}
                                />
                                <Button type="button" variant="outline" className="w-full" asChild>
                                  <span className="cursor-pointer flex items-center justify-center gap-2">
                                    <Plus className="w-4 h-4" />
                                    Upload from Device
                                  </span>
                                </Button>
                              </label>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">Or paste image URL:</Label>
                              <Input
                                value={formData.featured_image}
                                onChange={(e) => setFormData({ ...formData, featured_image: e.target.value })}
                                placeholder="https://example.com/image.jpg"
                              />
                            </div>
                            <div className="p-4 border-2 border-dashed rounded-lg text-center text-muted-foreground text-sm">
                              <Image className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p>Upload an image or paste a URL</p>
                              <p className="text-xs mt-1">Max 5MB • JPG, PNG, GIF, WebP</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Image Caption</Label>
                          <Input
                            value={formData.image_caption}
                            onChange={(e) => setFormData({ ...formData, image_caption: e.target.value })}
                            placeholder="Describe the image"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Image Credit</Label>
                          <Input
                            value={formData.image_credit}
                            onChange={(e) => setFormData({ ...formData, image_credit: e.target.value })}
                            placeholder="Photo by..."
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Video className="w-4 h-4" />
                          Video Embed URL
                        </Label>
                        <Input
                          value={formData.video_url}
                          onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                          placeholder="YouTube or Vimeo URL"
                        />
                        <p className="text-xs text-muted-foreground">
                          Paste a YouTube or Vimeo link. Video will replace the featured image on the article page.
                        </p>
                      </div>
                    </div>

                    <div className="border-t pt-4 space-y-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <Link2 className="w-4 h-4" />
                        Call-to-Action Block
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Add a custom CTA that appears at the end of the article
                      </p>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>CTA Text</Label>
                          <Textarea
                            value={formData.cta_text}
                            onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                            rows={2}
                            placeholder="Looking for sustainable materials for your next project?"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Button Link</Label>
                            <Input
                              value={formData.cta_link}
                              onChange={(e) => setFormData({ ...formData, cta_link: e.target.value })}
                              placeholder="/category/suppliers"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Button Label</Label>
                            <Input
                              value={formData.cta_label}
                              onChange={(e) => setFormData({ ...formData, cta_label: e.target.value })}
                              placeholder="Browse Suppliers"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* SEO & Tags Tab */}
                  <TabsContent value="seo" className="space-y-4 mt-4">
                    <div className="space-y-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <Hash className="w-4 h-4" />
                        Hashtags
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Add hashtags for SEO and discoverability. Each tag creates a clickable hub page.
                      </p>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={handleTagKeyDown}
                            placeholder="Type tag and press Enter"
                            className="pl-9"
                          />
                        </div>
                        <Button type="button" variant="outline" onClick={handleAddTag}>
                          Add
                        </Button>
                      </div>
                      {formData.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {formData.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                              #{tag}
                              <button
                                type="button"
                                onClick={() => handleRemoveTag(tag)}
                                className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Suggested: WellingtonConstruction, SustainableBuildingNZ, EcoBuild, PassiveHouseNZ, GreenBuilding
                      </p>
                    </div>

                    <div className="border-t pt-4 space-y-4">
                      <h4 className="font-medium">SEO Settings</h4>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Meta Title</Label>
                          <Input
                            value={formData.meta_title}
                            onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                            placeholder="SEO title (60 chars max)"
                            maxLength={60}
                          />
                          <p className="text-xs text-muted-foreground">
                            {formData.meta_title.length}/60 characters
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label>Meta Description</Label>
                          <Textarea
                            value={formData.meta_description}
                            onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                            placeholder="SEO description (160 chars max)"
                            maxLength={160}
                            rows={2}
                          />
                          <p className="text-xs text-muted-foreground">
                            {formData.meta_description.length}/160 characters
                          </p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Settings Tab */}
                  <TabsContent value="settings" className="space-y-4 mt-4">
                    <div className="space-y-4">
                      <h4 className="font-medium">Categories</h4>
                      <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map((cat) => (
                          <Badge
                            key={cat}
                            variant={formData.categories.includes(cat) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => handleCategoryToggle(cat)}
                          >
                            {CATEGORY_LABELS[cat]}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select
                          value={formData.status}
                          onValueChange={(value) => setFormData({ ...formData, status: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="published">Published</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Publish Date</Label>
                        <Input
                          type="datetime-local"
                          value={formData.published_at}
                          onChange={(e) => setFormData({ ...formData, published_at: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Location Scope */}
                    <div className="space-y-3 pt-4 border-t">
                      <h4 className="font-medium flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Geographic Scope
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Set whether this content is Wellington-specific or covers NZ-wide industry topics.
                      </p>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, location_scope: "wellington" })}
                          className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                            formData.location_scope === "wellington"
                              ? "border-accent bg-accent/10"
                              : "border-border hover:border-accent/50"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <MapPin className={`w-5 h-5 ${formData.location_scope === "wellington" ? "text-accent" : "text-muted-foreground"}`} />
                            <span className="font-medium">Wellington</span>
                          </div>
                          <p className="text-xs text-muted-foreground text-left">
                            Local Wellington news, events, and region-specific updates
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, location_scope: "national_nz" })}
                          className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                            formData.location_scope === "national_nz"
                              ? "border-blue-500 bg-blue-500/10"
                              : "border-border hover:border-blue-500/50"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Globe className={`w-5 h-5 ${formData.location_scope === "national_nz" ? "text-blue-500" : "text-muted-foreground"}`} />
                            <span className="font-medium">National (NZ)</span>
                          </div>
                          <p className="text-xs text-muted-foreground text-left">
                            NZ-wide industry news, regulations, sustainability standards
                          </p>
                        </button>
                      </div>
                      {formData.location_scope === "national_nz" && (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm">
                          <p className="text-amber-700 dark:text-amber-400">
                            <strong>Note:</strong> NZ-wide content must not promote or list businesses outside Wellington. 
                            Editorial coverage only — no marketplace CTAs for non-Wellington providers.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-6 pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={formData.is_featured}
                          onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                        />
                        <Label className="flex items-center gap-1">
                          <Star className="w-4 h-4" />
                          Featured
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={formData.is_trending}
                          onCheckedChange={(checked) => setFormData({ ...formData, is_trending: checked })}
                        />
                        <Label className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4" />
                          Trending
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={formData.is_pinned}
                          onCheckedChange={(checked) => setFormData({ ...formData, is_pinned: checked })}
                        />
                        <Label className="flex items-center gap-1">
                          <Pin className="w-4 h-4" />
                          Pinned
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={formData.ads_enabled}
                          onCheckedChange={(checked) => setFormData({ ...formData, ads_enabled: checked })}
                        />
                        <Label className="flex items-center gap-1">
                          <Megaphone className="w-4 h-4" />
                          Show Ads
                        </Label>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Ad Preview Tab */}
                  <TabsContent value="ads" className="space-y-4 mt-4">
                    <ArticleAdPreview 
                      content={formData.content}
                      adsEnabled={formData.ads_enabled}
                      adFrequency={5}
                      maxAds={3}
                    />
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? "Saving..." : "Save Article"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending Review</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Pending Approvals Section */}
        {pendingArticles && pendingArticles.length > 0 && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                Pending Review ({pendingArticles.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingArticles.slice(0, 5).map((article) => (
                  <div 
                    key={article.id} 
                    className="flex items-center justify-between p-3 bg-background rounded-lg border"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium truncate">{article.title}</p>
                        {/* Location scope badge */}
                        <Badge 
                          variant="outline" 
                          className={`text-xs shrink-0 ${
                            article.location_scope === 'wellington' 
                              ? "text-accent border-accent/50" 
                              : "text-blue-600 border-blue-400/50 dark:text-blue-400"
                          }`}
                        >
                          {article.location_scope === 'wellington' ? (
                            <><MapPin className="w-3 h-3 mr-1" />Wellington</>
                          ) : (
                            <><Globe className="w-3 h-3 mr-1" />National (NZ)</>
                          )}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>By {article.author}</span>
                        <span>•</span>
                        <span>{format(new Date(article.created_at), "MMM d, yyyy")}</span>
                        {article.word_count && (
                          <>
                            <span>•</span>
                            <span>{article.word_count} words</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(article)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Review
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => approveMutation.mutate(article)}
                        disabled={approveMutation.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setSelectedArticleForRejection(article);
                          setRejectionDialogOpen(true);
                        }}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
                {pendingArticles.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center">
                    +{pendingArticles.length - 5} more pending articles
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Analytics Tab */}
        <Tabs defaultValue="articles" className="space-y-4">
          <TabsList>
            <TabsTrigger value="articles">Articles</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="analytics">
            <BlogAnalyticsPanel />
          </TabsContent>

          <TabsContent value="articles" className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <FileText className="w-4 h-4" />
              <span className="text-sm">Total Articles</span>
            </div>
            <p className="text-2xl font-bold">{articles?.length || 0}</p>
          </div>
          <div className="bg-card border border-amber-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 text-amber-500 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Pending</span>
            </div>
            <p className="text-2xl font-bold text-amber-500">{pendingArticles?.length || 0}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Eye className="w-4 h-4" />
              <span className="text-sm">Published</span>
            </div>
            <p className="text-2xl font-bold">{articles?.filter((a) => a.status === "published").length || 0}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Star className="w-4 h-4" />
              <span className="text-sm">Featured</span>
            </div>
            <p className="text-2xl font-bold">{articles?.filter((a) => a.is_featured).length || 0}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">Total Views</span>
            </div>
            <p className="text-2xl font-bold">{articles?.reduce((sum, a) => sum + a.views, 0) || 0}</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Categories</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Views</TableHead>
                <TableHead>Flags</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredArticles?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No articles found
                  </TableCell>
                </TableRow>
              ) : (
                filteredArticles?.map((article) => (
                  <TableRow key={article.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{article.title}</p>
                        <p className="text-sm text-muted-foreground">/news/{article.slug}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(article.status)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {article.categories.slice(0, 2).map((cat) => (
                          <Badge key={cat} variant="outline" className="text-xs">
                            {CATEGORY_LABELS[cat]?.split(" ")[0]}
                          </Badge>
                        ))}
                        {article.categories.length > 2 && (
                          <Badge variant="outline" className="text-xs">+{article.categories.length - 2}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[120px]">
                        {(article.tags || []).slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}
                        {(article.tags || []).length > 2 && (
                          <Badge variant="secondary" className="text-xs">+{(article.tags || []).length - 2}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{article.views}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant={article.is_featured ? "default" : "ghost"}
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => toggleMutation.mutate({ id: article.id, field: "is_featured", value: !article.is_featured })}
                          title="Featured"
                        >
                          <Star className="w-3 h-3" />
                        </Button>
                        <Button
                          variant={article.is_trending ? "default" : "ghost"}
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => toggleMutation.mutate({ id: article.id, field: "is_trending", value: !article.is_trending })}
                          title="Trending"
                        >
                          <TrendingUp className="w-3 h-3" />
                        </Button>
                        <Button
                          variant={article.is_pinned ? "default" : "ghost"}
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => toggleMutation.mutate({ id: article.id, field: "is_pinned", value: !article.is_pinned })}
                          title="Pinned"
                        >
                          <Pin className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {article.published_at
                        ? format(new Date(article.published_at), "MMM d, yyyy")
                        : format(new Date(article.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(article)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => {
                            if (confirm("Delete this article?")) {
                              deleteMutation.mutate(article.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        </TabsContent>
        </Tabs>
        <Dialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-destructive" />
                Reject Article
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Rejecting: <strong>{selectedArticleForRejection?.title}</strong>
              </p>
              <div className="space-y-2">
                <Label>Reason for rejection *</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this article is being rejected and what changes are needed..."
                  rows={4}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setRejectionDialogOpen(false);
                    setSelectedArticleForRejection(null);
                    setRejectionReason("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={!rejectionReason.trim() || rejectMutation.isPending}
                  onClick={() => {
                    if (selectedArticleForRejection) {
                      rejectMutation.mutate({
                        article: selectedArticleForRejection,
                        reason: rejectionReason,
                      });
                    }
                  }}
                >
                  {rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminBlog;
