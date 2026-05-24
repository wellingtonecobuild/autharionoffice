import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface PortalUser {
  id: string;
  user_id: string | null;
  email: string;
  role: 'contractor' | 'employee';
  status: 'invited' | 'active' | 'suspended' | 'inactive';
  legal_full_name: string | null;
  ird_number: string | null;
  gst_registered: boolean;
  bank_account_number: string | null;
  hourly_rate: number | null;
  profile_completed: boolean;
  profile_completed_at: string | null;
  created_at: string;
  created_by: string | null;
}

interface PortalUserContextType {
  portalUser: PortalUser | null;
  isPortalUser: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

const PortalUserContext = createContext<PortalUserContextType>({
  portalUser: null,
  isPortalUser: false,
  loading: true,
  refresh: async () => {},
});

export const PortalUserProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [portalUser, setPortalUser] = useState<PortalUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPortalUser = async () => {
    if (!user) {
      setPortalUser(null);
      setLoading(false);
      return;
    }

    try {
      // First try to find by user_id (already linked)
      let { data, error } = await supabase
        .from('portal_users')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // If not found by user_id, try to find by email (for invited users who just signed up)
      if ((error || !data) && user.email) {
        const { data: emailData, error: emailError } = await supabase
          .from('portal_users')
          .select('*')
          .eq('email', user.email)
          .single();
        
        if (!emailError && emailData) {
          // Link the portal user to this auth user
          const { error: updateError } = await supabase
            .from('portal_users')
            .update({ 
              user_id: user.id,
              status: emailData.status === 'invited' ? 'active' : emailData.status
            })
            .eq('id', emailData.id);
          
          if (!updateError) {
            data = { ...emailData, user_id: user.id, status: emailData.status === 'invited' ? 'active' : emailData.status };
          }
        }
      }

      if (!data) {
        setPortalUser(null);
      } else {
        setPortalUser(data as PortalUser);
      }
    } catch (error) {
      console.error('Error fetching portal user:', error);
      setPortalUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    fetchPortalUser();
  }, [user, authLoading]);

  const refresh = async () => {
    await fetchPortalUser();
  };

  return (
    <PortalUserContext.Provider 
      value={{ 
        portalUser, 
        isPortalUser: !!portalUser && portalUser.status === 'active',
        loading: loading || authLoading, 
        refresh 
      }}
    >
      {children}
    </PortalUserContext.Provider>
  );
};

export const usePortalUser = () => {
  const context = useContext(PortalUserContext);
  if (!context) {
    throw new Error("usePortalUser must be used within a PortalUserProvider");
  }
  return context;
};
