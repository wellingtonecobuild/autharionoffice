import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Users, TrendingUp, AlertCircle, Zap } from "lucide-react";

interface UrgencyBadgeProps {
  type: "limited_spots" | "high_demand" | "trending" | "ending_soon" | "new";
  value?: string | number;
  className?: string;
}

export const UrgencyBadge = ({ type, value, className = "" }: UrgencyBadgeProps) => {
  const configs = {
    limited_spots: {
      icon: AlertCircle,
      text: `Only ${value} spots left`,
      bgClass: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    },
    high_demand: {
      icon: TrendingUp,
      text: "High Demand",
      bgClass: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    },
    trending: {
      icon: Zap,
      text: "Trending",
      bgClass: "bg-accent/20 text-accent-foreground",
    },
    ending_soon: {
      icon: Clock,
      text: `Ends in ${value}`,
      bgClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    },
    new: {
      icon: Zap,
      text: "New",
      bgClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    },
  };

  const config = configs[type];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bgClass} ${className}`}>
      <Icon className="w-3.5 h-3.5" />
      {config.text}
    </span>
  );
};

export const LiveViewerCount = ({ businessId }: { businessId?: string }) => {
  const [viewers, setViewers] = useState(0);

  useEffect(() => {
    // Simulate live viewers (in production, use actual analytics)
    const baseViewers = Math.floor(Math.random() * 5) + 1;
    setViewers(baseViewers);

    const interval = setInterval(() => {
      setViewers(prev => {
        const change = Math.random() > 0.5 ? 1 : -1;
        return Math.max(1, Math.min(10, prev + change));
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [businessId]);

  if (viewers < 2) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
      </span>
      <span>{viewers} people viewing now</span>
    </div>
  );
};

export const RecentActivityPopup = () => {
  const [activity, setActivity] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const activities = [
      "A homeowner in Karori just requested quotes",
      "New verified builder joined from Miramar",
      "5-star review posted for Green Build Co",
      "Project estimate completed for kitchen renovation",
      "New sustainable building question asked",
    ];

    const showActivity = () => {
      const randomActivity = activities[Math.floor(Math.random() * activities.length)];
      setActivity(randomActivity);
      setVisible(true);

      setTimeout(() => setVisible(false), 5000);
    };

    // Show first activity after 10 seconds
    const initialTimeout = setTimeout(showActivity, 10000);

    // Then show every 45-90 seconds
    const interval = setInterval(() => {
      if (Math.random() > 0.5) {
        showActivity();
      }
    }, 45000 + Math.random() * 45000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);

  if (!visible || !activity) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 animate-slide-up">
      <div className="glass rounded-xl p-4 max-w-xs shadow-lg border border-border/50">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium">{activity}</p>
            <p className="text-xs text-muted-foreground mt-1">Just now</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const CountdownTimer = ({ endDate, label }: { endDate: Date; label?: string }) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const diff = endDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("Ended");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [endDate]);

  return (
    <div className="flex items-center gap-2 text-sm">
      <Clock className="w-4 h-4 text-accent" />
      {label && <span className="text-muted-foreground">{label}:</span>}
      <span className="font-semibold tabular-nums">{timeLeft}</span>
    </div>
  );
};

export const SpotsRemaining = ({ category, total = 5 }: { category: string; total?: number }) => {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const fetchRemaining = async () => {
      const { data } = await supabase
        .from("elite_category_caps")
        .select("current_count, max_slots")
        .eq("category", category)
        .single();

      if (data) {
        setRemaining(data.max_slots - data.current_count);
      }
    };

    fetchRemaining();
  }, [category]);

  if (remaining === null || remaining > 3) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-1">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full border-2 border-background ${
              i < (total - (remaining || 0)) ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>
      <span className="text-sm font-medium text-red-600 dark:text-red-400">
        Only {remaining} Elite {remaining === 1 ? "spot" : "spots"} left
      </span>
    </div>
  );
};

export default UrgencyBadge;
