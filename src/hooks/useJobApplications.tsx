import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type ApplicationStatus = 'new' | 'viewed' | 'shortlisted' | 'interview' | 'rejected' | 'hired' | 'withdrawn';

export interface JobSeekerProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  location: string | null;
  trade_role: string | null;
  work_eligibility: string | null;
  cv_url: string | null;
  cv_file_name: string | null;
  cover_letter_default: string | null;
  bio: string | null;
  years_experience: number | null;
  certifications: string[] | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface JobApplication {
  id: string;
  job_id: string;
  applicant_id: string;
  business_id: string;
  cover_letter: string | null;
  cv_url: string | null;
  cv_file_name: string | null;
  status: ApplicationStatus;
  status_notes: string | null;
  status_changed_at: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobApplicationWithDetails extends JobApplication {
  job: {
    id: string;
    title: string;
    location: string;
    job_type: string;
    business_id: string;
    expires_at: string;
  };
  business: {
    id: string;
    name: string;
    category: string;
  };
  applicant_profile?: JobSeekerProfile;
}

export interface JobMessage {
  id: string;
  application_id: string;
  sender_id: string;
  sender_type: 'applicant' | 'employer' | 'admin';
  content: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

// Hook for job seeker profile
export function useJobSeekerProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<JobSeekerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('job_seeker_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setProfile(data);
    } catch (err) {
      console.error('Error fetching job seeker profile:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const saveProfile = async (profileData: Partial<Omit<JobSeekerProfile, 'id' | 'created_at' | 'updated_at'>>) => {
    if (!user?.id) return { error: 'Not authenticated' };

    if (profile) {
      const { error } = await supabase
        .from('job_seeker_profiles')
        .update(profileData)
        .eq('user_id', user.id);
      
      if (!error) fetchProfile();
      return { error };
    } else {
      const { error } = await supabase
        .from('job_seeker_profiles')
        .insert({ ...profileData, user_id: user.id, full_name: profileData.full_name || '', email: profileData.email || '' });
      
      if (!error) fetchProfile();
      return { error };
    }
  };

  return { profile, loading, fetchProfile, saveProfile };
}

// Hook for job seeker's applications
export function useMyApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<JobApplicationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApplications = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('job_applications')
        .select(`
          *,
          job:jobs!inner(id, title, location, job_type, business_id, expires_at),
          business:businesses!inner(id, name, category)
        `)
        .eq('applicant_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications((data as JobApplicationWithDetails[]) || []);
    } catch (err) {
      console.error('Error fetching applications:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const withdrawApplication = async (applicationId: string) => {
    const { error } = await supabase
      .from('job_applications')
      .update({ status: 'withdrawn' })
      .eq('id', applicationId)
      .eq('applicant_id', user?.id);

    if (!error) fetchApplications();
    return { error };
  };

  return { applications, loading, fetchApplications, withdrawApplication };
}

// Hook for employer's applications dashboard
export function useEmployerApplications(businessId: string | undefined) {
  const [applications, setApplications] = useState<JobApplicationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApplications = useCallback(async () => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('job_applications')
        .select(`
          *,
          job:jobs!inner(id, title, location, job_type, business_id, expires_at),
          business:businesses!inner(id, name, category)
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch applicant profiles separately
      const applicantIds = [...new Set(data?.map(a => a.applicant_id) || [])];
      
      if (applicantIds.length > 0) {
        const { data: profiles } = await supabase
          .from('job_seeker_profiles')
          .select('*')
          .in('user_id', applicantIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        
        const enriched = (data || []).map(app => ({
          ...app,
          applicant_profile: profileMap.get(app.applicant_id),
        }));

        setApplications(enriched as JobApplicationWithDetails[]);
      } else {
        setApplications((data as JobApplicationWithDetails[]) || []);
      }
    } catch (err) {
      console.error('Error fetching employer applications:', err);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const updateApplicationStatus = async (applicationId: string, status: ApplicationStatus, notes?: string) => {
    const { error } = await supabase
      .from('job_applications')
      .update({ 
        status, 
        status_notes: notes,
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', applicationId);

    if (!error) {
      // Trigger notification
      await supabase.functions.invoke('job-application-notify', {
        body: { type: 'application_status_changed', applicationId, newStatus: status },
      });
      fetchApplications();
    }
    return { error };
  };

  const markAsRead = async (applicationId: string) => {
    const { error } = await supabase
      .from('job_applications')
      .update({ 
        is_read: true,
        read_at: new Date().toISOString(),
        status: 'viewed',
      })
      .eq('id', applicationId)
      .eq('is_read', false);

    if (!error) fetchApplications();
    return { error };
  };

  return { applications, loading, fetchApplications, updateApplicationStatus, markAsRead };
}

// Hook for job messages/chat
export function useJobMessages(applicationId: string | undefined) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<JobMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    if (!applicationId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('job_messages')
        .select('*')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data as JobMessage[]) || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Real-time subscription
  useEffect(() => {
    if (!applicationId) return;

    const channel = supabase
      .channel(`job-messages-${applicationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'job_messages',
          filter: `application_id=eq.${applicationId}`,
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as JobMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [applicationId]);

  const sendMessage = async (content: string, senderType: 'applicant' | 'employer') => {
    if (!applicationId || !user?.id) return { error: 'Missing data' };

    const { error } = await supabase
      .from('job_messages')
      .insert({
        application_id: applicationId,
        sender_id: user.id,
        sender_type: senderType,
        content,
      });

    if (!error) {
      // Trigger notification
      await supabase.functions.invoke('job-application-notify', {
        body: { type: 'new_message', applicationId, messageContent: content },
      });
    }

    return { error };
  };

  const markMessagesAsRead = async () => {
    if (!applicationId || !user?.id) return;

    await supabase
      .from('job_messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('application_id', applicationId)
      .neq('sender_id', user.id)
      .eq('is_read', false);
  };

  return { messages, loading, fetchMessages, sendMessage, markMessagesAsRead };
}

// Hook to submit a job application
export function useSubmitApplication() {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const submitApplication = async (
    jobId: string,
    businessId: string,
    coverLetter?: string,
    cvUrl?: string,
    cvFileName?: string
  ) => {
    if (!user?.id) return { error: 'Not authenticated' };

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('job_applications')
        .insert({
          job_id: jobId,
          applicant_id: user.id,
          business_id: businessId,
          cover_letter: coverLetter,
          cv_url: cvUrl,
          cv_file_name: cvFileName,
        })
        .select()
        .single();

      if (error) throw error;

      // Fire-and-forget: notification in background for faster response
      supabase.functions.invoke('job-application-notify', {
        body: { type: 'application_submitted', applicationId: data.id },
      }).catch(console.error);

      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    } finally {
      setSubmitting(false);
    }
  };

  return { submitApplication, submitting };
}