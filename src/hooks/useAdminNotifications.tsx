import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAdminNotifications() {
  const { data: unreadContacts = 0 } = useQuery({
    queryKey: ["admin-unread-contacts"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("contact_submissions")
        .select("*", { count: "exact", head: true })
        .eq("is_read", false);

      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000,
  });

  const { data: unreadLeads = 0 } = useQuery({
    queryKey: ["admin-unread-leads"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("is_read", false);

      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000,
  });

  const { data: unreadNotifications = 0 } = useQuery({
    queryKey: ["admin-unread-notifications"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("admin_notifications")
        .select("*", { count: "exact", head: true })
        .eq("is_read", false);

      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000,
  });

  return {
    unreadContacts,
    unreadLeads,
    unreadNotifications,
    totalUnread: unreadContacts + unreadLeads + unreadNotifications,
  };
}
