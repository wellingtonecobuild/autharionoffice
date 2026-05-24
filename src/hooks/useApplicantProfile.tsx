import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface WorkHistory {
  id: string;
  company_name: string;
  job_title: string;
  location: string | null;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field_of_study: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
}

export interface Certification {
  id: string;
  name: string;
  issuing_organization: string;
  issue_date: string | null;
  expiry_date: string | null;
  credential_id: string | null;
  credential_url: string | null;
  document_url: string | null;
}

export interface Skill {
  id: string;
  skill_name: string;
  proficiency_level: string | null;
  years_experience: number | null;
}

export interface UserDocument {
  id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  is_primary: boolean;
  created_at: string;
}

export interface ApplicantProfile {
  workHistory: WorkHistory[];
  education: Education[];
  certifications: Certification[];
  skills: Skill[];
  documents: UserDocument[];
}

export function useApplicantProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ApplicantProfile>({
    workHistory: [],
    education: [],
    certifications: [],
    skills: [],
    documents: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [workRes, eduRes, certRes, skillRes, docRes] = await Promise.all([
        supabase.from('user_work_history').select('*').eq('user_id', user.id).order('start_date', { ascending: false }),
        supabase.from('user_education').select('*').eq('user_id', user.id).order('start_date', { ascending: false }),
        supabase.from('user_certifications').select('*').eq('user_id', user.id).order('issue_date', { ascending: false }),
        supabase.from('user_skills').select('*').eq('user_id', user.id).order('skill_name'),
        supabase.from('user_documents').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);

      setProfile({
        workHistory: (workRes.data || []) as WorkHistory[],
        education: (eduRes.data || []) as Education[],
        certifications: (certRes.data || []) as Certification[],
        skills: (skillRes.data || []) as Skill[],
        documents: (docRes.data || []) as UserDocument[],
      });
    } catch (error) {
      console.error('Error fetching applicant profile:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Work History CRUD
  const addWorkHistory = async (data: Omit<WorkHistory, 'id'>) => {
    if (!user) return { error: new Error('Not authenticated') };
    const { error } = await supabase.from('user_work_history').insert({ ...data, user_id: user.id });
    if (!error) fetchProfile();
    return { error };
  };

  const updateWorkHistory = async (id: string, data: Partial<WorkHistory>) => {
    const { error } = await supabase.from('user_work_history').update(data).eq('id', id);
    if (!error) fetchProfile();
    return { error };
  };

  const deleteWorkHistory = async (id: string) => {
    const { error } = await supabase.from('user_work_history').delete().eq('id', id);
    if (!error) fetchProfile();
    return { error };
  };

  // Education CRUD
  const addEducation = async (data: Omit<Education, 'id'>) => {
    if (!user) return { error: new Error('Not authenticated') };
    const { error } = await supabase.from('user_education').insert({ ...data, user_id: user.id });
    if (!error) fetchProfile();
    return { error };
  };

  const updateEducation = async (id: string, data: Partial<Education>) => {
    const { error } = await supabase.from('user_education').update(data).eq('id', id);
    if (!error) fetchProfile();
    return { error };
  };

  const deleteEducation = async (id: string) => {
    const { error } = await supabase.from('user_education').delete().eq('id', id);
    if (!error) fetchProfile();
    return { error };
  };

  // Certifications CRUD
  const addCertification = async (data: Omit<Certification, 'id'>) => {
    if (!user) return { error: new Error('Not authenticated') };
    const { error } = await supabase.from('user_certifications').insert({ ...data, user_id: user.id });
    if (!error) fetchProfile();
    return { error };
  };

  const updateCertification = async (id: string, data: Partial<Certification>) => {
    const { error } = await supabase.from('user_certifications').update(data).eq('id', id);
    if (!error) fetchProfile();
    return { error };
  };

  const deleteCertification = async (id: string) => {
    const { error } = await supabase.from('user_certifications').delete().eq('id', id);
    if (!error) fetchProfile();
    return { error };
  };

  // Skills CRUD
  const addSkill = async (data: Omit<Skill, 'id'>) => {
    if (!user) return { error: new Error('Not authenticated') };
    const { error } = await supabase.from('user_skills').insert({ ...data, user_id: user.id });
    if (!error) fetchProfile();
    return { error };
  };

  const deleteSkill = async (id: string) => {
    const { error } = await supabase.from('user_skills').delete().eq('id', id);
    if (!error) fetchProfile();
    return { error };
  };

  // Document Upload
  const uploadDocument = async (file: File, documentType: string, isPrimary: boolean = false) => {
    if (!user) return { error: new Error('Not authenticated') };

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('user-documents')
      .upload(fileName, file);

    if (uploadError) return { error: uploadError };

    const { data: { publicUrl } } = supabase.storage
      .from('user-documents')
      .getPublicUrl(fileName);

    // If setting as primary, unset other primaries of same type
    if (isPrimary) {
      await supabase.from('user_documents')
        .update({ is_primary: false })
        .eq('user_id', user.id)
        .eq('document_type', documentType);
    }

    const { error } = await supabase.from('user_documents').insert({
      user_id: user.id,
      document_type: documentType,
      file_name: file.name,
      file_url: publicUrl,
      file_size: file.size,
      is_primary: isPrimary,
    });

    if (!error) fetchProfile();
    return { error };
  };

  const deleteDocument = async (id: string, fileUrl: string) => {
    // Extract file path from URL
    const urlParts = fileUrl.split('/user-documents/');
    if (urlParts[1]) {
      await supabase.storage.from('user-documents').remove([urlParts[1]]);
    }
    
    const { error } = await supabase.from('user_documents').delete().eq('id', id);
    if (!error) fetchProfile();
    return { error };
  };

  const setPrimaryDocument = async (id: string, documentType: string) => {
    if (!user) return { error: new Error('Not authenticated') };
    
    await supabase.from('user_documents')
      .update({ is_primary: false })
      .eq('user_id', user.id)
      .eq('document_type', documentType);

    const { error } = await supabase.from('user_documents')
      .update({ is_primary: true })
      .eq('id', id);

    if (!error) fetchProfile();
    return { error };
  };

  return {
    profile,
    loading,
    refetch: fetchProfile,
    addWorkHistory,
    updateWorkHistory,
    deleteWorkHistory,
    addEducation,
    updateEducation,
    deleteEducation,
    addCertification,
    updateCertification,
    deleteCertification,
    addSkill,
    deleteSkill,
    uploadDocument,
    deleteDocument,
    setPrimaryDocument,
  };
}
