import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Star, Flame, Trophy, ChevronRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";

interface UserPoints {
  total_points: number;
  level: number;
  streak_days: number;
}

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000, 2000, 5000, 10000];
const LEVEL_NAMES = ["Newcomer", "Explorer", "Builder", "Expert", "Master", "Legend", "Champion", "Elite"];

export const UserPointsDisplay = ({ showDetails = true }: { showDetails?: boolean }) => {
  const { user } = useAuth();
  const [points, setPoints] = useState<UserPoints | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchPoints = async () => {
      const { data } = await supabase
        .from("user_points")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      if (data) setPoints(data);
    };

    fetchPoints();
  }, [user]);

  if (!user || !points) return null;

  const currentLevel = points.level;
  const currentThreshold = LEVEL_THRESHOLDS[currentLevel - 1] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[currentLevel] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const progress = ((points.total_points - currentThreshold) / (nextThreshold - currentThreshold)) * 100;

  if (!showDetails) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-accent">
          <Star className="w-4 h-4 fill-current" />
          <span className="font-semibold">{points.total_points}</span>
        </div>
        {points.streak_days > 0 && (
          <div className="flex items-center gap-1 text-orange-500">
            <Flame className="w-4 h-4" />
            <span className="text-sm">{points.streak_days}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <Link to="/profile?tab=achievements" className="block">
      <div className="glass rounded-xl p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-accent-foreground" />
            </div>
            <div>
              <p className="font-semibold">{LEVEL_NAMES[currentLevel - 1]}</p>
              <p className="text-sm text-muted-foreground">Level {currentLevel}</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-accent fill-accent" />
              {points.total_points} points
            </span>
            <span className="text-muted-foreground">
              {nextThreshold - points.total_points} to next level
            </span>
          </div>
          <Progress value={Math.min(progress, 100)} className="h-2" />
        </div>

        {points.streak_days > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              <span className="text-sm font-medium">{points.streak_days} day streak!</span>
              <span className="text-xs text-muted-foreground">Keep it going</span>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
};

export default UserPointsDisplay;
