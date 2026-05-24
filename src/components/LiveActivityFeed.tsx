import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Users, Star, Building2, MessageSquare, Award } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: string;
  activity_type: string;
  description: string;
  metadata: any;
  city: string;
  created_at: string;
}

const ACTIVITY_ICONS: Record<string, any> = {
  new_business: Building2,
  new_review: Star,
  new_question: MessageSquare,
  new_member: Users,
  badge_earned: Award,
  default: Activity,
};

const ACTIVITY_COLORS: Record<string, string> = {
  new_business: "text-primary",
  new_review: "text-accent",
  new_question: "text-blue-500",
  new_member: "text-emerald-500",
  badge_earned: "text-accent",
  default: "text-muted-foreground",
};

export const LiveActivityFeed = ({ compact = false }: { compact?: boolean }) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Fetch recent activities
    const fetchActivities = async () => {
      const { data } = await supabase
        .from("site_activity")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (data) setActivities(data);
    };

    fetchActivities();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("site_activity_feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "site_activity" },
        (payload) => {
          setActivities((prev) => [payload.new as ActivityItem, ...prev.slice(0, 19)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Auto-rotate through activities
  useEffect(() => {
    if (activities.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % Math.min(activities.length, 5));
    }, 4000);

    return () => clearInterval(interval);
  }, [activities.length]);

  if (activities.length === 0) return null;

  const currentActivity = activities[currentIndex];
  const Icon = ACTIVITY_ICONS[currentActivity?.activity_type] || ACTIVITY_ICONS.default;
  const colorClass = ACTIVITY_COLORS[currentActivity?.activity_type] || ACTIVITY_COLORS.default;

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm animate-fade-in">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-muted-foreground">{currentActivity?.description}</span>
        <span className="text-xs text-muted-foreground/60">
          {formatDistanceToNow(new Date(currentActivity?.created_at), { addSuffix: true })}
        </span>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-4 overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live Activity</span>
      </div>
      
      <div className="space-y-3">
        {activities.slice(0, 5).map((activity, index) => {
          const ActivityIcon = ACTIVITY_ICONS[activity.activity_type] || ACTIVITY_ICONS.default;
          const activityColor = ACTIVITY_COLORS[activity.activity_type] || ACTIVITY_COLORS.default;
          
          return (
            <div
              key={activity.id}
              className={`flex items-center gap-3 transition-all duration-500 ${
                index === currentIndex ? "opacity-100 scale-100" : "opacity-60 scale-98"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg bg-muted flex items-center justify-center ${activityColor}`}>
                <ActivityIcon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{activity.description}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LiveActivityFeed;
