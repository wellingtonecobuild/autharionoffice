import { Link } from "react-router-dom";
import { Hash, TrendingUp } from "lucide-react";
import { format } from "date-fns";

interface Article {
  id: string;
  title: string;
  slug: string;
  featured_image: string | null;
  views: number;
  published_at: string;
}

interface Tag {
  name: string;
  count: number;
}

interface MostReadSidebarProps {
  articles: Article[];
  tags?: Tag[];
}

export const MostReadSidebar = ({ articles, tags }: MostReadSidebarProps) => {
  return (
    <aside className="space-y-6">
      {/* Most Read */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <h3 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-accent" />
          Popular Articles
        </h3>
        <div className="space-y-4">
          {articles.map((article, idx) => (
            <Link
              key={article.id}
              to={`/news/${article.slug}`}
              className="flex gap-3 group"
            >
              <span className="text-2xl font-bold text-accent/30 shrink-0 w-8">
                {String(idx + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <h4 className="font-medium text-foreground text-sm group-hover:text-accent transition-colors line-clamp-2">
                  {article.title}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(article.published_at), "MMM d, yyyy")}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Popular Tags */}
      {tags && tags.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-6">
          <h3 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
            <Hash className="w-4 h-4 text-accent" />
            Popular Topics
          </h3>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Link
                key={tag.name}
                to={`/tag/${encodeURIComponent(tag.name.replace(/\s+/g, "-"))}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-muted text-muted-foreground rounded-full text-sm hover:bg-accent/10 hover:text-accent transition-colors"
              >
                <Hash className="w-3 h-3" />
                {tag.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="bg-gradient-to-br from-forest to-forest-light rounded-2xl p-6 text-primary-foreground">
        <h3 className="font-display text-lg font-semibold mb-2">Apply to Be Listed</h3>
        <p className="text-sm text-primary-foreground/80 mb-3">
          Join Wellington's premier sustainable construction directory.
        </p>
        <Link
          to="/list-business"
          className="inline-block bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
        >
          Apply Now
        </Link>
        <p className="text-xs text-primary-foreground/60 mt-2">
          Limited verified builders per area
        </p>
      </div>
    </aside>
  );
};
