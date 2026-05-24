import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useBusinessCount = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["business-count"],
    queryFn: async () => {
      // businesses_public only contains active/approved businesses via trigger
      const { count, error } = await supabase
        .from("businesses_public")
        .select("*", { count: "exact", head: true });

      if (error) throw error;
      return count || 0;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Subscribe to real-time changes
  useEffect(() => {
    const channel = supabase
      .channel("business-count-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "businesses_public",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["business-count"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
};
