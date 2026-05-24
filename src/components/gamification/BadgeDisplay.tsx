import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  Star, Award, Shield, Crown, Flame, MessageSquare, 
  CheckCircle, HelpCircle, Calculator, Zap 
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
}

interface UserBadge {
  id: string;
  badge_id: string;
  earned_at: string;
  badges: Badge;
}

const ICON_MAP: Record<string, any> = {
  star: Star,
  award: Award,
  "shield-check": Shield,
  crown: Crown,
  flame: Flame,
  "message-square": MessageSquare,
  "check-circle": CheckCircle,
  "help-circle": HelpCircle,
  calculator: Calculator,
  default: Zap,
};

const CATEGORY_COLORS: Record<string, string> = {
  membership: "from-blue-500 to-blue-600",
  community: "from-emerald-500 to-emerald-600",
  business: "from-primary to-primary/80",
  engagement: "from-orange-500 to-orange-600",
  homeowner: "from-purple-500 to-purple-600",
};

export const BadgeDisplay = ({ userId, limit = 6, showAll = false }: { 
  userId?: string; 
  limit?: number;
  showAll?: boolean;
}) => {
  const { user } = useAuth();
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);

  const targetUserId = userId || user?.id;

  useEffect(() => {
    if (!targetUserId) return;

    const fetchBadges = async () => {
      // Fetch user's earned badges
      const { data: earned } = await supabase
        .from("user_badges")
        .select("*, badges(*)")
        .eq("user_id", targetUserId)
        .order("earned_at", { ascending: false });
      
      if (earned) setUserBadges(earned as unknown as UserBadge[]);

      if (showAll) {
        // Fetch all available badges
        const { data: all } = await supabase
          .from("badges")
          .select("*")
          .eq("is_active", true)
          .order("category", { ascending: true });
        
        if (all) setAllBadges(all);
      }
    };

    fetchBadges();
  }, [targetUserId, showAll]);

  const earnedBadgeIds = new Set(userBadges.map(ub => ub.badge_id));

  if (showAll) {
    const categories = [...new Set(allBadges.map(b => b.category))];
    
    return (
      <div className="space-y-6">
        {categories.map(category => {
          const categoryBadges = allBadges.filter(b => b.category === category);
          
          return (
            <div key={category}>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 capitalize">
                {category}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {categoryBadges.map(badge => {
                  const isEarned = earnedBadgeIds.has(badge.id);
                  const earnedBadge = userBadges.find(ub => ub.badge_id === badge.id);
                  const Icon = ICON_MAP[badge.icon] || ICON_MAP.default;
                  const colorClass = CATEGORY_COLORS[badge.category] || "from-gray-500 to-gray-600";
                  
                  return (
                    <div
                      key={badge.id}
                      className={`relative p-4 rounded-xl border text-center transition-all ${
                        isEarned 
                          ? "bg-card border-accent/30 shadow-sm" 
                          : "bg-muted/30 border-border/50 opacity-50 grayscale"
                      }`}
                    >
                      <div className={`w-12 h-12 mx-auto mb-2 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <p className="font-medium text-sm">{badge.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{badge.description}</p>
                      {isEarned && earnedBadge && (
                        <p className="text-xs text-accent mt-2">
                          Earned {format(new Date(earnedBadge.earned_at), "MMM d, yyyy")}
                        </p>
                      )}
                      {!isEarned && (
                        <p className="text-xs text-muted-foreground mt-2">Not yet earned</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const displayBadges = userBadges.slice(0, limit);

  if (displayBadges.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No badges earned yet. Start engaging to earn your first badge!</p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {displayBadges.map(userBadge => {
        const badge = userBadge.badges;
        const Icon = ICON_MAP[badge.icon] || ICON_MAP.default;
        const colorClass = CATEGORY_COLORS[badge.category] || "from-gray-500 to-gray-600";
        
        return (
          <Tooltip key={userBadge.id}>
            <TooltipTrigger asChild>
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorClass} flex items-center justify-center cursor-help shadow-sm`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-semibold">{badge.name}</p>
              <p className="text-xs text-muted-foreground">{badge.description}</p>
              <p className="text-xs mt-1">Earned {format(new Date(userBadge.earned_at), "MMM d, yyyy")}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
      {userBadges.length > limit && (
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
          +{userBadges.length - limit}
        </div>
      )}
    </div>
  );
};

export default BadgeDisplay;
