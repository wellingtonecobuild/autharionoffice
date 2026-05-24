import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { RichTextEditor } from './RichTextEditor';
import {
  Send,
  Save,
  Loader2,
  Hash,
  Image as ImageIcon,
  Upload,
  Trash2,
  X,
} from 'lucide-react';

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
  wellington_construction_news: "Wellington News",
  sustainable_building: "Sustainable Building",
  supplier_updates: "Supplier Updates",
  projects_developments: "Projects",
  renovation_retrofit: "Renovation",
  regulations_compliance: "Regulations",
  market_trends: "Market Trends",
  eco_building_education: "Education",
  construction_opportunities: "Careers",
  finance_construction: "Finance & Costs",
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

interface ArticleFormData {
  title: string;
  summary: string;
  content: string;
  featured_image: string;
  tags: string[];
  meta_description: string;
  is_published: boolean;
}

interface ArticleSubmissionFormProps {
  articleId?: string;
  onSuccess?: () => void;
}

export function ArticleSubmissionForm({ articleId, onSuccess }: ArticleSubmissionFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<ArticleFormData>({
    title: '',
    summary: '',
    content: '',
    featured_image: '',
    tags: [],
    meta_description: '',
    is_published: false,
  });

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Error', description: 'Please select an image file', variant: 'destructive' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Error', description: 'Image must be less than 5MB', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('article-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('article-images')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, featured_image: publicUrl }));
      toast({ title: 'Success', description: 'Image uploaded successfully' });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({ title: 'Error', description: error.message || 'Failed to upload image', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, featured_image: '' }));
  };

  useEffect(() => {
    if (articleId) {
      loadArticle();
    }
  }, [articleId]);

  async function loadArticle() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('id', articleId)
        .single();

      if (error) throw error;
      if (data) {
        setFormData({
          title: data.title,
          summary: data.excerpt || '',
          content: data.content,
          featured_image: data.featured_image || '',
          tags: data.tags || [],
          meta_description: data.meta_description || '',
          is_published: data.status === 'published',
        });
      }
    } catch (error) {
      console.error('Error loading article:', error);
      toast({ title: 'Error', description: 'Failed to load article', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const calculateWordCount = () => {
    const text = formData.content.replace(/<[^>]*>/g, '');
    return text.split(/\s+/).filter(Boolean).length;
  };

  const handleAddTag = () => {
    const tag = tagInput.trim().replace(/^#/, '');
    if (tag && !formData.tags.includes(tag) && formData.tags.length < 8) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  async function handleSubmit(asDraft: boolean = false) {
    // Validation
    if (!formData.title.trim()) {
      toast({ title: 'Error', description: 'Title is required', variant: 'destructive' });
      return;
    }
    if (!formData.summary.trim()) {
      toast({ title: 'Error', description: 'Summary is required', variant: 'destructive' });
      return;
    }
    if (!formData.content.trim()) {
      toast({ title: 'Error', description: 'Content is required', variant: 'destructive' });
      return;
    }
    if (!formData.featured_image.trim()) {
      toast({ title: 'Error', description: 'Featured image is required for publishing', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const slug = generateSlug(formData.title);
      const wordCount = calculateWordCount();
      const status = asDraft ? 'draft' : 'published';

      const articleData = {
        title: formData.title,
        slug,
        excerpt: formData.summary,
        content: formData.content,
        featured_image: formData.featured_image || null,
        categories: ['market_trends'] as BlogCategory[],
        tags: formData.tags.length > 0 ? formData.tags : null,
        author: 'Wellington EcoBuild',
        meta_description: formData.meta_description || formData.summary.substring(0, 160),
        status,
        word_count: wordCount,
        submitted_by: user?.id,
        published_at: status === 'published' ? new Date().toISOString() : null,
        is_featured: false,
        location_scope: 'wellington',
      };

      if (articleId) {
        const { error } = await supabase
          .from('articles')
          .update(articleData)
          .eq('id', articleId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('articles')
          .insert(articleData);
        if (error) throw error;
      }

      toast({
        title: asDraft ? 'Draft Saved' : 'Published',
        description: asDraft 
          ? 'Your draft has been saved.' 
          : 'Your market insight has been published.',
      });

      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/admin/blog');
      }
    } catch (error: any) {
      console.error('Error saving article:', error);
      toast({ title: 'Error', description: error.message || 'Failed to save article', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Title */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Post Title *</CardTitle>
          <CardDescription>Your headline - clear, professional, Wellington-focused</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Building the Capital: Why Wellington's Construction Job Market Is Booming"
            className="text-lg font-medium"
          />
        </CardContent>
      </Card>

      {/* Short Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Short Summary *</CardTitle>
          <CardDescription>2-3 lines that appear on the listing page and social shares</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.summary}
            onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
            placeholder="Wellington's construction sector is experiencing sustained demand driven by infrastructure investment, seismic strengthening, and skilled labour shortages."
            rows={3}
            maxLength={300}
          />
          <p className="text-xs text-muted-foreground mt-1">{formData.summary.length}/300 characters</p>
        </CardContent>
      </Card>

      {/* Featured Image */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Featured Image *
          </CardTitle>
          <CardDescription>Required - main image for the article</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex-1"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Image
                </>
              )}
            </Button>
          </div>

          {formData.featured_image && (
            <div className="relative group">
              <img
                src={formData.featured_image}
                alt="Featured preview"
                className="w-full max-h-64 object-cover rounded-lg border"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleRemoveImage}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Remove
              </Button>
            </div>
          )}

          {!formData.featured_image && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              An image is required to publish this insight.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Article Content */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Content *</CardTitle>
          <CardDescription>Main article body - use headings, bullet points, and clear sections</CardDescription>
        </CardHeader>
        <CardContent>
          <RichTextEditor
            content={formData.content}
            onChange={(content) => setFormData({ ...formData, content })}
            placeholder="Start writing your market insight..."
          />
          <p className="text-xs text-muted-foreground mt-2">{calculateWordCount()} words</p>
        </CardContent>
      </Card>

      {/* Tags (Optional) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Industry Tags
          </CardTitle>
          <CardDescription>Optional - helps with search and discovery</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="construction, infrastructure, trades..."
                className="pl-9"
                disabled={formData.tags.length >= 8}
              />
            </div>
            <Button type="button" variant="outline" onClick={handleAddTag} disabled={formData.tags.length >= 8}>
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
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SEO Meta Description (Optional - Admin Only) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">SEO Meta Description</CardTitle>
          <CardDescription>Optional - defaults to summary if not provided</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.meta_description}
            onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
            placeholder="Custom meta description for search engines..."
            maxLength={160}
            rows={2}
          />
          <p className="text-xs text-muted-foreground mt-1">{formData.meta_description.length}/160 characters</p>
        </CardContent>
      </Card>

      {/* Legal Disclaimer */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Legal Disclaimer:</strong> By submitting this post, you confirm you are the owner of this content or have permission to post it. Posting third-party content without consent is prohibited by Wellington EcoBuild and may result in removal of your content and account suspension.
          </p>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 border-t pt-6 sticky bottom-0 bg-background pb-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => handleSubmit(true)}
          disabled={saving}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save Draft
        </Button>
        <Button
          type="button"
          onClick={() => handleSubmit(false)}
          disabled={saving || !formData.featured_image}
          className="min-w-[140px]"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
          Publish
        </Button>
      </div>
    </div>
  );
}
