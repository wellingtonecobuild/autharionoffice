import { Link } from "react-router-dom";
import { TrendingUp } from "lucide-react";

interface Article {
  id: string;
  title: string;
  slug: string;
}

interface TrendingBarProps {
  articles: Article[];
}

export const TrendingBar = ({ articles }: TrendingBarProps) => {
  if (!articles || articles.length === 0) return null;

  return (
    <section className="py-3 bg-accent/5 border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide">
          <span className="flex items-center gap-2 text-sm font-semibold text-accent shrink-0">
            <TrendingUp className="w-4 h-4" />
            Trending
          </span>
          <div className="h-4 w-px bg-border shrink-0" />
          {articles.map((article, idx) => (
            <Link
              key={article.id}
              to={`/news/${article.slug}`}
              className="text-sm text-muted-foreground hover:text-accent transition-colors whitespace-nowrap group"
            >
              <span className="text-accent font-medium mr-2">{idx + 1}.</span>
              <span className="group-hover:underline">{article.title}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
