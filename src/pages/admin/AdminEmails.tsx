import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import {
  Mail,
  Inbox,
  Send,
  Search,
  Plus,
  Paperclip,
  Archive,
  Reply,
  Forward,
  User,
  Download,
  RefreshCw,
  X,
  History,
  Upload,
  File,
  MailOpen,
  Shield,
  FolderOpen,
  HelpCircle,
  Scale,
  Handshake,
  Megaphone,
  UserCircle,
  Lock,
  CheckCircle2,
  Building2,
  CreditCard,
  Trash2,
  MailCheck,
  MailX,
  Bell,
  BellRing,
  ExternalLink,
  Phone,
  Globe
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { EMAIL_IDENTITIES, COMPANY_INFO, SENDER_MODES, getDisplayName, type SenderMode, type EmailCategory } from "@/lib/emailIdentities";

interface EmailThread {
  id: string;
  subject: string;
  channel_type: string;
  status: string;
  priority: string;
  category: string | null;
  email_category: string | null;
  initiator_id: string | null;
  initiator_email: string | null;
  initiator_name: string | null;
  initiator_role: string;
  is_broadcast: boolean;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  resolved_at: string | null;
  message_count?: number;
  has_attachments?: boolean;
  latest_message?: string;
}

interface EmailMessage {
  id: string;
  thread_id: string;
  sender_id: string | null;
  sender_email: string | null;
  sender_name: string | null;
  sender_role: string;
  content: string;
  html_content: string | null;
  is_system_message: boolean;
  read_at: string | null;
  created_at: string;
  sent_from_identity: string | null;
}

interface Attachment {
  id: string;
  message_id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  status: string;
  created_at: string;
}

interface AuditEntry {
  id: string;
  action: string;
  actor_email: string | null;
  actor_role: string | null;
  details: any;
  created_at: string;
}

interface UserDetails {
  id?: string;
  email?: string;
  full_name?: string;
  phone?: string;
  company_name?: string;
  website?: string;
}

// Single unified inbox - all emails use info@wellingtonecobuild.nz
const INBOX_FOLDERS = [
  { key: 'all', label: 'All Messages', icon: FolderOpen, color: 'text-muted-foreground' },
  { key: 'info', label: 'Inbox', icon: Mail, color: 'text-blue-500', email: EMAIL_IDENTITIES.info.address },
  { key: 'support', label: 'Support', icon: HelpCircle, color: 'text-green-500', email: EMAIL_IDENTITIES.info.address },
  { key: 'billing', label: 'Billing', icon: CreditCard, color: 'text-emerald-500', email: EMAIL_IDENTITIES.info.address },
  { key: 'verification', label: 'Verification', icon: Shield, color: 'text-amber-500', email: EMAIL_IDENTITIES.info.address },
] as const;

export default function AdminEmails() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [attachments, setAttachments] = useState<Record<string, Attachment[]>>({});
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  // View state
  const [activeFolder, setActiveFolder] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'inbox' | 'sent' | 'archive'>('inbox');
  const [selectedThreads, setSelectedThreads] = useState<Set<string>>(new Set());
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [hasAttachments, setHasAttachments] = useState(false);
  
  // Compose
  const [showCompose, setShowCompose] = useState(false);
  const [composeSubject, setComposeSubject] = useState("");
  const [composeMessage, setComposeMessage] = useState("");
  const [composeRecipient, setComposeRecipient] = useState("");
  const [composeRecipientName, setComposeRecipientName] = useState("");
  const [composeSendAs, setComposeSendAs] = useState<EmailCategory>('info');
  const [composeSenderMode, setComposeSenderMode] = useState<SenderMode>('admin');
  
  // Reply
  const [replyContent, setReplyContent] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [replySendAs, setReplySendAs] = useState<EmailCategory>('info');
  const [replySenderMode, setReplySenderMode] = useState<SenderMode>('admin');
  
  // Forward
  const [showForward, setShowForward] = useState(false);
  const [forwardRecipient, setForwardRecipient] = useState("");
  const [forwardRecipientName, setForwardRecipientName] = useState("");
  const [forwardNote, setForwardNote] = useState("");
  
  // Files
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  
  // Dialogs
  const [showAuditLog, setShowAuditLog] = useState(false);
  
  // Onboarding Guide
  const [showOnboardingGuide, setShowOnboardingGuide] = useState(false);
  const [onboardingEmail, setOnboardingEmail] = useState("");
  const [onboardingName, setOnboardingName] = useState("");
  const [sendingOnboarding, setSendingOnboarding] = useState(false);
  
  // User details
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  
  // Real-time notifications
  const [newMessageAlert, setNewMessageAlert] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchThreads();
    }
  }, [isAdmin, activeFolder, viewMode, statusFilter, hasAttachments]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!isAdmin) return;
    
    const channel = supabase
      .channel('admin-email-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'communication_threads'
        },
        (payload) => {
          console.log('[REALTIME] New thread:', payload);
          setNewMessageAlert(true);
          setUnreadCount(prev => prev + 1);
          toast.info('New message received', {
            description: (payload.new as EmailThread).subject,
            action: {
              label: 'View',
              onClick: () => fetchThreads()
            }
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'communication_messages'
        },
        (payload) => {
          // If the message is from a visitor (reply to our thread)
          const msg = payload.new as any;
          if (msg.sender_role === 'visitor' || msg.sender_role === 'user') {
            setNewMessageAlert(true);
            setUnreadCount(prev => prev + 1);
          }
          // If we're viewing this thread, refresh messages
          if (selectedThread && msg.thread_id === selectedThread.id) {
            fetchMessages(selectedThread.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, selectedThread]);

  // Fetch user details when thread is selected
  const fetchUserDetails = async (email: string | null, userId: string | null) => {
    if (!email && !userId) {
      setUserDetails(null);
      return;
    }
    
    try {
      // Try to find profile
      let profile = null;
      if (userId) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        profile = data;
      } else if (email) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .ilike('email', email)
          .single();
        profile = data;
      }

      // Try to find business
      let business = null;
      if (email) {
        const { data } = await supabase
          .from('businesses')
          .select('name, phone, website')
          .ilike('email', email)
          .single();
        business = data;
      }

      setUserDetails({
        id: profile?.id,
        email: profile?.email || email || undefined,
        full_name: profile?.full_name,
        phone: profile?.phone || business?.phone,
        company_name: business?.name,
        website: business?.website
      });
    } catch (error) {
      setUserDetails({ email: email || undefined });
    }
  };

  const fetchThreads = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('communication_threads')
        .select('*')
        .order('last_message_at', { ascending: false });

      // Apply view mode filters
      if (viewMode === 'inbox') {
        query = query.in('status', ['unread', 'read', 'replied', 'under_review']);
      } else if (viewMode === 'sent') {
        // Show threads initiated by admin OR threads that have admin replies
        query = query.or('initiator_role.eq.admin,status.eq.replied');
      } else if (viewMode === 'archive') {
        query = query.eq('status', 'archived');
      }

      // Apply folder filter (email category)
      if (activeFolder !== 'all') {
        query = query.eq('email_category', activeFolder);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data: threadsData, error } = await query;
      if (error) throw error;

      // Enrich threads with counts
      const enrichedThreads: EmailThread[] = [];
      for (const thread of threadsData || []) {
        const { data: messagesData } = await supabase
          .from('communication_messages')
          .select('content')
          .eq('thread_id', thread.id)
          .order('created_at', { ascending: false })
          .limit(1);
        
        const { count: messageCount } = await supabase
          .from('communication_messages')
          .select('*', { count: 'exact', head: true })
          .eq('thread_id', thread.id);

        const { count: attachmentCount } = await supabase
          .from('communication_attachments')
          .select('*', { count: 'exact', head: true })
          .in('message_id', 
            (await supabase.from('communication_messages').select('id').eq('thread_id', thread.id)).data?.map(m => m.id) || []
          );

        enrichedThreads.push({
          ...thread as EmailThread,
          message_count: messageCount || 0,
          has_attachments: (attachmentCount || 0) > 0,
          latest_message: messagesData?.[0]?.content?.substring(0, 100) || ''
        });
      }

      const filteredThreads = hasAttachments 
        ? enrichedThreads.filter(t => t.has_attachments)
        : enrichedThreads;

      setThreads(filteredThreads);
      
      // Update unread count
      const unread = filteredThreads.filter(t => t.status === 'unread').length;
      setUnreadCount(unread);
      if (unread === 0) setNewMessageAlert(false);
    } catch (error) {
      console.error('Error fetching threads:', error);
      toast.error('Failed to fetch emails');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (threadId: string) => {
    try {
      const { data, error } = await supabase
        .from('communication_messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setMessages((data || []) as EmailMessage[]);
      
      const messageIds = (data || []).map(m => m.id);
      if (messageIds.length > 0) {
        const { data: attachData } = await supabase
          .from('communication_attachments')
          .select('*')
          .in('message_id', messageIds);
        
        const grouped: Record<string, Attachment[]> = {};
        (attachData || []).forEach((att: any) => {
          if (!grouped[att.message_id]) grouped[att.message_id] = [];
          grouped[att.message_id].push(att as Attachment);
        });
        setAttachments(grouped);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchAuditLogs = async (threadId: string) => {
    try {
      const { data, error } = await supabase
        .from('communication_audit_log')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setAuditLogs((data || []) as AuditEntry[]);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    }
  };

  const selectThread = async (thread: EmailThread) => {
    setSelectedThread(thread);
    setIsReplying(false);
    setReplyContent("");
    
    // Set default reply identity based on thread category
    const category = (thread.email_category || 'info') as EmailCategory;
    if (EMAIL_IDENTITIES[category]) {
      setReplySendAs(category);
    }
    
    await fetchMessages(thread.id);
    await fetchUserDetails(thread.initiator_email, thread.initiator_id);
    
    if (thread.status === 'unread') {
      await supabase
        .from('communication_threads')
        .update({ status: 'read' })
        .eq('id', thread.id);
      
      setThreads(prev => prev.map(t => 
        t.id === thread.id ? { ...t, status: 'read' } : t
      ));

      await supabase.from('communication_audit_log').insert({
        thread_id: thread.id,
        action: 'thread_read',
        actor_email: EMAIL_IDENTITIES[replySendAs].address,
        actor_role: 'admin'
      });
    }
  };

  // Toggle read/unread status
  const toggleReadStatus = async (thread: EmailThread) => {
    const newStatus = thread.status === 'unread' ? 'read' : 'unread';
    
    try {
      await supabase
        .from('communication_threads')
        .update({ status: newStatus })
        .eq('id', thread.id);
      
      setThreads(prev => prev.map(t => 
        t.id === thread.id ? { ...t, status: newStatus } : t
      ));
      
      if (selectedThread?.id === thread.id) {
        setSelectedThread(prev => prev ? { ...prev, status: newStatus } : null);
      }
      
      await supabase.from('communication_audit_log').insert({
        thread_id: thread.id,
        action: newStatus === 'unread' ? 'marked_unread' : 'marked_read',
        actor_email: EMAIL_IDENTITIES.info.address,
        actor_role: 'admin'
      });
      
      toast.success(`Marked as ${newStatus}`);
    } catch (error) {
      console.error('Error toggling read status:', error);
      toast.error('Failed to update status');
    }
  };

  // Delete single message
  const deleteMessage = async (messageId: string) => {
    if (!selectedThread) return;

    try {
      // 1) Delete audit logs referencing this message first (FK safety)
      {
        const { error } = await supabase
          .from("communication_audit_log")
          .delete()
          .eq("message_id", messageId);
        if (error) throw error;
      }

      // 2) Delete attachments (storage + rows)
      {
        const { data: messageAttachments, error } = await supabase
          .from("communication_attachments")
          .select("file_path")
          .eq("message_id", messageId);
        if (error) throw error;

        const paths = (messageAttachments || []).map((a) => a.file_path).filter(Boolean);
        if (paths.length > 0) {
          const { error: storageErr } = await supabase.storage
            .from("communication-attachments")
            .remove(paths);
          if (storageErr) throw storageErr;

          const { error: attErr } = await supabase
            .from("communication_attachments")
            .delete()
            .eq("message_id", messageId);
          if (attErr) throw attErr;
        }
      }

      // 3) Delete the message
      {
        const { error } = await supabase
          .from("communication_messages")
          .delete()
          .eq("id", messageId);
        if (error) throw error;
      }

      // 4) Log deletion (do not reference deleted message_id)
      {
        const { error } = await supabase.from("communication_audit_log").insert({
          thread_id: selectedThread.id,
          action: "message_deleted",
          actor_email: EMAIL_IDENTITIES.info.address,
          actor_role: "admin",
          details: { deleted_message_id: messageId },
        });
        if (error) throw error;
      }

      toast.success("Message deleted");
      await fetchMessages(selectedThread.id);
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error("Failed to delete message");
    }
  };

  // Delete entire thread
  const deleteThread = async (threadId: string) => {
    try {
      // Get all messages (for attachment cleanup)
      const { data: msgs, error: msgListErr } = await supabase
        .from("communication_messages")
        .select("id")
        .eq("thread_id", threadId);
      if (msgListErr) throw msgListErr;

      const messageIds = (msgs || []).map((m: any) => m.id).filter(Boolean);

      // 1) Delete audit logs first (FK safety)
      {
        const { error } = await supabase
          .from("communication_audit_log")
          .delete()
          .eq("thread_id", threadId);
        if (error) throw error;
      }

      // 2) Delete attachments (storage + rows)
      if (messageIds.length > 0) {
        const { data: threadAttachments, error: attListErr } = await supabase
          .from("communication_attachments")
          .select("file_path")
          .in("message_id", messageIds);
        if (attListErr) throw attListErr;

        const paths = (threadAttachments || []).map((a: any) => a.file_path).filter(Boolean);
        if (paths.length > 0) {
          const { error: storageErr } = await supabase.storage
            .from("communication-attachments")
            .remove(paths);
          if (storageErr) throw storageErr;
        }

        const { error: attDelErr } = await supabase
          .from("communication_attachments")
          .delete()
          .in("message_id", messageIds);
        if (attDelErr) throw attDelErr;
      }

      // 3) Delete messages
      {
        const { error } = await supabase
          .from("communication_messages")
          .delete()
          .eq("thread_id", threadId);
        if (error) throw error;
      }

      // 4) Delete participants
      {
        const { error } = await supabase
          .from("communication_participants")
          .delete()
          .eq("thread_id", threadId);
        if (error) throw error;
      }

      // 5) Delete thread
      {
        const { error } = await supabase
          .from("communication_threads")
          .delete()
          .eq("id", threadId);
        if (error) throw error;
      }

      toast.success("Thread deleted permanently");

      if (selectedThread?.id === threadId) {
        setSelectedThread(null);
        setMessages([]);
      }

      await fetchThreads();
    } catch (error) {
      console.error("Error deleting thread:", error);
      toast.error("Failed to delete thread");
    }
  };

  const toggleThreadSelection = (threadId: string, checked: boolean) => {
    setSelectedThreads((prev) => {
      const next = new Set(prev);
      if (checked) next.add(threadId);
      else next.delete(threadId);
      return next;
    });
  };

  const clearThreadSelection = () => setSelectedThreads(new Set());

  const deleteSelectedThreads = async () => {
    const ids = Array.from(selectedThreads);
    if (ids.length === 0) return;

    // Keep it simple: delete one by one so we don't end up half-deleting attachments
    for (const id of ids) {
      // eslint-disable-next-line no-await-in-loop
      await deleteThread(id);
    }

    clearThreadSelection();
  };

  // Forward email
  const forwardEmail = async () => {
    if (!selectedThread || !forwardRecipient.trim()) {
      toast.error('Please enter a recipient email');
      return;
    }
    
    setSending(true);
    try {
      // Create a new thread for the forwarded email
      const { data: userData } = await supabase.auth.getUser();
      const displayName = getDisplayName('info', 'admin');
      
      // Compile original thread content
      const originalContent = messages.map(msg => 
        `From: ${msg.sender_name || msg.sender_email}\nDate: ${format(new Date(msg.created_at), 'PPp')}\n\n${msg.content}`
      ).join('\n\n---\n\n');
      
      const forwardedContent = forwardNote 
        ? `${forwardNote}\n\n---------- Forwarded message ----------\n\n${originalContent}`
        : `---------- Forwarded message ----------\n\n${originalContent}`;
      
      const { data: threadData, error: threadError } = await supabase
        .from('communication_threads')
        .insert({
          subject: `Fwd: ${selectedThread.subject}`,
          channel_type: 'email',
          status: 'replied',
          priority: 'normal',
          initiator_id: userData.user?.id,
          initiator_email: EMAIL_IDENTITIES.info.address,
          initiator_name: displayName,
          initiator_role: 'admin',
          email_category: 'info'
        })
        .select()
        .single();
      
      if (threadError) throw threadError;
      
      const { data: msgData, error: msgError } = await supabase
        .from('communication_messages')
        .insert({
          thread_id: threadData.id,
          sender_id: userData.user?.id,
          sender_email: EMAIL_IDENTITIES.info.address,
          sender_name: displayName,
          sender_role: 'admin',
          content: forwardedContent
        })
        .select()
        .single();
      
      if (msgError) throw msgError;
      
      // Send email
      await supabase.functions.invoke('send-communication-email', {
        body: {
          thread_id: threadData.id,
          message_id: msgData.id,
          recipient_email: forwardRecipient,
          recipient_name: forwardRecipientName || undefined,
          subject: `Fwd: ${selectedThread.subject}`,
          message_content: forwardedContent,
          sender_name: displayName,
          sender_email: EMAIL_IDENTITIES.info.address,
          sender_mode: 'admin',
          reply_type: 'admin_reply'
        }
      });
      
      // Log to original thread
      await supabase.from('communication_audit_log').insert({
        thread_id: selectedThread.id,
        action: 'thread_forwarded',
        actor_email: EMAIL_IDENTITIES.info.address,
        actor_role: 'admin',
        details: {
          forwarded_to: forwardRecipient,
          new_thread_id: threadData.id
        }
      });
      
      setShowForward(false);
      setForwardRecipient("");
      setForwardRecipientName("");
      setForwardNote("");
      toast.success(`Email forwarded to ${forwardRecipient}`);
      fetchThreads();
    } catch (error) {
      console.error('Error forwarding email:', error);
      toast.error('Failed to forward email');
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => f.size <= 25 * 1024 * 1024);
    if (validFiles.length < files.length) {
      toast.error('Some files were too large (max 25MB)');
    }
    setPendingFiles(prev => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFilesForMessage = async (messageId: string, threadId: string) => {
    if (pendingFiles.length === 0) return [];
    
    setUploading(true);
    const uploadedAttachments: { name: string; url: string }[] = [];
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      for (const file of pendingFiles) {
        const timestamp = Date.now();
        const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `${userData.user?.id}/${threadId}/${timestamp}_${safeFileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('communication-attachments')
          .upload(filePath, file);
        
        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }
        
        await supabase
          .from('communication_attachments')
          .insert({
            message_id: messageId,
            file_name: file.name,
            file_path: filePath,
            file_type: file.type,
            file_size: file.size,
            status: 'approved'
          });

        const { data: urlData } = supabase.storage
          .from('communication-attachments')
          .getPublicUrl(filePath);
        
        uploadedAttachments.push({
          name: file.name,
          url: urlData.publicUrl
        });
      }
      setPendingFiles([]);
      return uploadedAttachments;
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload some files');
      return [];
    } finally {
      setUploading(false);
    }
  };

  const downloadAttachment = async (att: Attachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('communication-attachments')
        .download(att.file_path);
      
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = att.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading:', error);
      toast.error('Failed to download file');
    }
  };

  const sendReply = async () => {
    if (!selectedThread || (!replyContent.trim() && pendingFiles.length === 0)) return;
    
    setSending(true);
    const selectedIdentity = EMAIL_IDENTITIES[replySendAs];
    const displayName = getDisplayName(replySendAs, replySenderMode);
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data: msgData, error } = await supabase
        .from('communication_messages')
        .insert({
          thread_id: selectedThread.id,
          sender_id: userData.user?.id,
          sender_email: selectedIdentity.address,
          sender_name: displayName,
          sender_role: 'admin',
          content: replyContent || 'Attachment sent'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      const uploadedAttachments = await uploadFilesForMessage(msgData.id, selectedThread.id);
      
      await supabase
        .from('communication_threads')
        .update({ 
          status: 'replied',
          last_message_at: new Date().toISOString(),
          email_category: replySendAs
        })
        .eq('id', selectedThread.id);
      
      // Send email notification
      if (selectedThread.initiator_email && selectedThread.initiator_role !== 'admin') {
        await supabase.functions.invoke('send-communication-email', {
          body: {
            thread_id: selectedThread.id,
            message_id: msgData.id,
            recipient_email: selectedThread.initiator_email,
            recipient_name: selectedThread.initiator_name,
            subject: `Re: ${selectedThread.subject}`,
            message_content: replyContent,
            sender_name: displayName,
            sender_email: selectedIdentity.address,
            sender_mode: replySenderMode,
            attachments: uploadedAttachments,
            reply_type: 'admin_reply'
          }
        });
      }
      
      setReplyContent("");
      setIsReplying(false);
      await fetchMessages(selectedThread.id);
      const modeLabel = replySenderMode === 'admin' ? '(Admin)' : '(Company)';
      toast.success(`Reply sent from ${selectedIdentity.address} ${modeLabel}`);
      
      fetchThreads();
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const createNewEmail = async () => {
    if (!composeSubject.trim() || !composeMessage.trim() || !composeRecipient.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setSending(true);
    const selectedIdentity = EMAIL_IDENTITIES[composeSendAs];
    const displayName = getDisplayName(composeSendAs, composeSenderMode);
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data: threadData, error: threadError } = await supabase
        .from('communication_threads')
        .insert({
          subject: composeSubject,
          channel_type: 'email',
          status: 'replied',
          priority: 'normal',
          initiator_id: userData.user?.id,
          initiator_email: selectedIdentity.address,
          initiator_name: displayName,
          initiator_role: 'admin',
          is_broadcast: false,
          category: 'outgoing',
          email_category: composeSendAs
        })
        .select()
        .single();
      
      if (threadError) throw threadError;
      
      const { data: msgData, error: msgError } = await supabase
        .from('communication_messages')
        .insert({
          thread_id: threadData.id,
          sender_id: userData.user?.id,
          sender_email: selectedIdentity.address,
          sender_name: displayName,
          sender_role: 'admin',
          content: composeMessage
        })
        .select()
        .single();
      
      if (msgError) throw msgError;
      
      const uploadedAttachments = await uploadFilesForMessage(msgData.id, threadData.id);
      
      await supabase.from('communication_participants').insert({
        thread_id: threadData.id,
        user_email: composeRecipient,
        user_role: 'user'
      });
      
      await supabase.functions.invoke('send-communication-email', {
        body: {
          thread_id: threadData.id,
          message_id: msgData.id,
          recipient_email: composeRecipient,
          recipient_name: composeRecipientName || undefined,
          subject: composeSubject,
          message_content: composeMessage,
          sender_name: displayName,
          sender_email: selectedIdentity.address,
          sender_mode: composeSenderMode,
          attachments: uploadedAttachments,
          reply_type: 'admin_reply'
        }
      });
      
      setShowCompose(false);
      setComposeSubject("");
      setComposeMessage("");
      setComposeRecipient("");
      setComposeRecipientName("");
      setPendingFiles([]);
      
      const modeLabel = composeSenderMode === 'admin' ? '(Admin)' : '(Company)';
      toast.success(`Email sent from ${selectedIdentity.address} ${modeLabel}`);
      fetchThreads();
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const archiveThread = async (threadId: string) => {
    try {
      await supabase
        .from('communication_threads')
        .update({ status: 'archived' })
        .eq('id', threadId);
      
      toast.success('Email archived');
      setSelectedThread(null);
      fetchThreads();
    } catch (error) {
      console.error('Error archiving:', error);
      toast.error('Failed to archive');
    }
  };

  // Send contractor onboarding guide
  const sendOnboardingGuide = async () => {
    if (!onboardingEmail.trim()) {
      toast.error('Please enter a recipient email');
      return;
    }
    
    setSendingOnboarding(true);
    try {
      const { error } = await supabase.functions.invoke('send-branded-email', {
        body: {
          to: onboardingEmail.trim(),
          type: 'contractor_onboarding',
          data: {
            recipientName: onboardingName.trim() || undefined
          }
        }
      });
      
      if (error) throw error;
      
      toast.success(`Onboarding guide sent to ${onboardingEmail}`);
      setShowOnboardingGuide(false);
      setOnboardingEmail("");
      setOnboardingName("");
    } catch (error) {
      console.error('Error sending onboarding guide:', error);
      toast.error('Failed to send onboarding guide');
    } finally {
      setSendingOnboarding(false);
    }
  };

  const filteredThreads = threads.filter(thread => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      thread.subject.toLowerCase().includes(query) ||
      thread.initiator_email?.toLowerCase().includes(query) ||
      thread.initiator_name?.toLowerCase().includes(query) ||
      thread.latest_message?.toLowerCase().includes(query)
    );
  });

  const stats = {
    total: threads.length,
    unread: threads.filter(t => t.status === 'unread').length,
    attachments: threads.filter(t => t.has_attachments).length
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'unread': return <Mail className="h-4 w-4 text-blue-500" />;
      case 'read': return <MailOpen className="h-4 w-4 text-muted-foreground" />;
      case 'replied': return <Reply className="h-4 w-4 text-green-500" />;
      case 'archived': return <Archive className="h-4 w-4 text-muted-foreground" />;
      default: return <Mail className="h-4 w-4" />;
    }
  };

  const getCategoryIcon = (category: string | null) => {
    const folder = INBOX_FOLDERS.find(f => f.key === category);
    if (folder) {
      const Icon = folder.icon;
      return <Icon className={cn("h-3 w-3", folder.color)} />;
    }
    return <Mail className="h-3 w-3 text-muted-foreground" />;
  };

  if (adminLoading) {
    return (
      <AdminLayout title="Email Center">
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Email Center">
      <div className="h-[calc(100vh-120px)] flex flex-col">
        {/* Top Bar */}
        <div className="flex items-center justify-between pb-4 border-b">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Mail className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold">Professional Email Center</h1>
            </div>
            {unreadCount > 0 && (
              <Badge variant="default" className="animate-pulse">{unreadCount} unread</Badge>
            )}
            {newMessageAlert && (
              <div className="flex items-center gap-2 text-amber-500">
                <BellRing className="h-5 w-5 animate-bounce" />
                <span className="text-sm font-medium">New message!</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {newMessageAlert && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setNewMessageAlert(false);
                  fetchThreads();
                }}
                className="text-amber-500 border-amber-500 hover:bg-amber-500/10"
              >
                <Bell className="h-4 w-4 mr-2" />
                View New
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={fetchThreads}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button 
              variant="default" 
              className="bg-primary hover:bg-primary/90"
              onClick={() => setShowOnboardingGuide(true)}
            >
              <User className="h-4 w-4 mr-2" />
              Send Onboarding Guide
            </Button>
            <Button variant="outline" onClick={() => setShowCompose(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Compose Email
            </Button>
          </div>
        </div>

        {/* Main Layout */}
        <div className="flex-1 flex gap-4 pt-4 overflow-hidden">
          {/* Sidebar - Inboxes */}
          <div className="w-64 flex-shrink-0 space-y-4">
            {/* View Mode - Professional Layout */}
            <Card className="overflow-hidden">
              <CardHeader className="py-2 px-4 bg-muted/30">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Mail Folders
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <nav className="space-y-1">
                  {[
                    { mode: 'inbox', icon: Inbox, label: 'Inbox', count: threads.filter(t => t.status === 'unread').length },
                    { mode: 'sent', icon: Send, label: 'Sent Items', count: threads.filter(t => t.status === 'replied' || t.initiator_role === 'admin').length },
                    { mode: 'archive', icon: Archive, label: 'Archive', count: 0 }
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.mode}
                        onClick={() => setViewMode(item.mode as 'inbox' | 'sent' | 'archive')}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all",
                          viewMode === item.mode 
                            ? "bg-primary text-primary-foreground font-medium shadow-sm" 
                            : "hover:bg-muted text-foreground"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </div>
                        {item.count > 0 && viewMode !== item.mode && (
                          <Badge variant="secondary" className="h-5 min-w-[20px] text-[10px]">
                            {item.count}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>

            {/* Email Inboxes by Category */}
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Inboxes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 pt-0">
                <nav className="space-y-1">
                  {INBOX_FOLDERS.map((folder) => {
                    const Icon = folder.icon;
                    const count = folder.key === 'all' 
                      ? threads.filter(t => t.status === 'unread').length
                      : threads.filter(t => t.email_category === folder.key && t.status === 'unread').length;
                    
                    return (
                      <button
                        key={folder.key}
                        onClick={() => setActiveFolder(folder.key)}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                          activeFolder === folder.key ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={cn("h-4 w-4", folder.color)} />
                          <span className="truncate">{folder.label}</span>
                        </div>
                        {count > 0 && (
                          <Badge variant="default" className="h-5 min-w-[20px] text-[10px]">
                            {count}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-medium">{stats.total}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Unread</span>
                  <Badge variant="default" className="h-5">{stats.unread}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">With files</span>
                  <span className="font-medium">{stats.attachments}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Email List */}
          <Card className="w-96 flex-shrink-0 flex flex-col">
            <CardHeader className="py-3 px-4 border-b space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="unread">Unread</SelectItem>
                    <SelectItem value="read">Read</SelectItem>
                    <SelectItem value="replied">Replied</SelectItem>
                  </SelectContent>
                </Select>
                <label className="flex items-center gap-2 px-2 cursor-pointer">
                  <Checkbox 
                    checked={hasAttachments}
                    onCheckedChange={(checked) => setHasAttachments(!!checked)}
                  />
                  <Paperclip className="h-3 w-3" />
                </label>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground">
                  {selectedThreads.size > 0 ? `${selectedThreads.size} selected` : ""}
                </div>
                <div className="flex items-center gap-2">
                  {selectedThreads.size > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8"
                      onClick={(e) => {
                        e.preventDefault();
                        clearThreadSelection();
                      }}
                    >
                      Clear
                    </Button>
                  )}

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-8"
                        disabled={selectedThreads.size === 0}
                      >
                        <Trash2 className="h-3 w-3 mr-2" />
                        Delete selected
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete selected threads?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the selected threads (including messages and attachments). This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={deleteSelectedThreads}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            
            <ScrollArea className="flex-1">
              <div className="divide-y">
                {loading ? (
                  <div className="p-8 text-center">
                    <RefreshCw className="h-6 w-6 mx-auto mb-2 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Loading emails...</p>
                  </div>
                ) : filteredThreads.length === 0 ? (
                  <div className="p-8 text-center">
                    <Mail className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No emails found</p>
                  </div>
                ) : (
                  filteredThreads.map((thread) => (
                    <div
                      key={thread.id}
                      onClick={() => selectThread(thread)}
                      className={cn(
                        "p-3 cursor-pointer transition-colors",
                        selectedThread?.id === thread.id ? "bg-primary/5" : "hover:bg-muted/50",
                        thread.status === 'unread' && "bg-blue-50/50 dark:bg-blue-950/20"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="pt-0.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={selectedThreads.has(thread.id)}
                            onCheckedChange={(checked) => toggleThreadSelection(thread.id, !!checked)}
                            aria-label="Select thread"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusIcon(thread.status)}
                            <span className={cn(
                              "font-medium text-sm truncate",
                              thread.status === 'unread' && "font-semibold"
                            )}>
                              {thread.initiator_name || thread.initiator_email || 'Unknown'}
                            </span>
                          </div>
                          <p className={cn(
                            "text-sm truncate mb-1",
                            thread.status === 'unread' ? "font-medium text-foreground" : "text-muted-foreground"
                          )}>
                            {thread.subject}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {thread.latest_message || 'No preview'}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            {getCategoryIcon(thread.email_category)}
                            {thread.has_attachments && <Paperclip className="h-3 w-3 text-muted-foreground" />}
                            {thread.message_count && thread.message_count > 1 && (
                              <span className="text-[10px] text-muted-foreground">({thread.message_count})</span>
                            )}
                            <span className="text-[10px] text-muted-foreground ml-auto">
                              {formatDistanceToNow(new Date(thread.last_message_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </Card>

          {/* Email Detail */}
          <Card className="flex-1 flex flex-col min-w-0">
            {selectedThread ? (
              <>
                <CardHeader className="py-3 px-4 border-b flex-shrink-0">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 min-w-0">
                      <CardTitle className="text-lg truncate">{selectedThread.subject}</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>{selectedThread.initiator_name || selectedThread.initiator_email}</span>
                        {getCategoryIcon(selectedThread.email_category)}
                      </div>
                      {/* Enhanced User Details */}
                      {userDetails && (
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                          {userDetails.company_name && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Building2 className="h-3 w-3" />
                              {userDetails.company_name}
                            </span>
                          )}
                          {userDetails.phone && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {userDetails.phone}
                            </span>
                          )}
                          {userDetails.website && (
                            <a 
                              href={userDetails.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-primary hover:underline"
                            >
                              <Globe className="h-3 w-3" />
                              Website
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Mark Read/Unread */}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => toggleReadStatus(selectedThread)}
                        title={selectedThread.status === 'unread' ? 'Mark as read' : 'Mark as unread'}
                      >
                        {selectedThread.status === 'unread' ? (
                          <MailCheck className="h-4 w-4" />
                        ) : (
                          <MailX className="h-4 w-4" />
                        )}
                      </Button>
                      {/* Forward */}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setShowForward(true)}
                        title="Forward email"
                      >
                        <Forward className="h-4 w-4" />
                      </Button>
                      {/* Audit Log */}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          fetchAuditLogs(selectedThread.id);
                          setShowAuditLog(true);
                        }}
                        title="View audit trail"
                      >
                        <History className="h-4 w-4" />
                      </Button>
                      {/* Archive */}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => archiveThread(selectedThread.id)}
                        title="Archive thread"
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                      {/* Delete Thread */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" title="Delete thread">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Thread Permanently?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete this email thread, all messages, and attachments. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteThread(selectedThread.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete Permanently
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>

                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div 
                        key={msg.id}
                        className={cn(
                          "rounded-lg p-4 group relative",
                          msg.sender_role === 'admin' 
                            ? "bg-primary/5 ml-8 border-l-2 border-primary" 
                            : "bg-muted mr-8"
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{msg.sender_name || msg.sender_email}</span>
                            {msg.sender_role === 'admin' && (
                              <Badge variant="outline" className="text-[10px]">
                                {msg.sender_email}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(msg.created_at), 'PPp')}
                            </span>
                            {/* Delete message button */}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Message?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete this message and its attachments.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => deleteMessage(msg.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                         <div className="text-sm whitespace-pre-wrap">
                           {(() => {
                             const raw = msg.content || "";
                             const looksPlaceholder = /^body\s*plain$/i.test(raw.trim());
                             if (looksPlaceholder && msg.html_content) {
                               return msg.html_content
                                 .replace(/<style[\s\S]*?<\/style>/gi, " ")
                                 .replace(/<script[\s\S]*?<\/script>/gi, " ")
                                 .replace(/<[^>]*>/g, " ")
                                 .replace(/\s+/g, " ")
                                 .trim();
                             }
                             return raw;
                           })()}
                         </div>
                        
                        {attachments[msg.id] && attachments[msg.id].length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="text-xs text-muted-foreground mb-2">Attachments:</div>
                            <div className="flex flex-wrap gap-2">
                              {attachments[msg.id].map((att) => (
                                <Button
                                  key={att.id}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => downloadAttachment(att)}
                                  className="h-8 text-xs"
                                >
                                  <File className="h-3 w-3 mr-2" />
                                  {att.file_name}
                                  <Download className="h-3 w-3 ml-2" />
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Professional Sticky Reply Section */}
                <div className="sticky bottom-0 bg-background border-t shadow-lg">
                  {/* Branded Header */}
                  <div className="bg-gradient-to-r from-primary to-primary/80 px-4 py-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img 
                          src="https://duumxykzcliujgyrmzvn.supabase.co/storage/v1/object/public/avatars/wellington-ecobuild-logo-PQDk3oCl.png" 
                          alt="Wellington EcoBuild"
                          className="h-6 w-auto"
                          loading="eager"
                          fetchPriority="high"
                        />
                        <span className="text-xs font-medium text-primary-foreground/90">Official Correspondence</span>
                      </div>
                      <Badge variant="secondary" className="text-[10px] bg-primary-foreground/20 text-primary-foreground border-0">
                        {replySenderMode === 'admin' ? 'Personal' : 'Official'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    {isReplying ? (
                      <div className="space-y-3">
                        {/* Professional Sender Configuration */}
                        <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg border">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Send From</label>
                            <Select value={replySendAs} onValueChange={(v) => setReplySendAs(v as EmailCategory)}>
                              <SelectTrigger className="h-9 bg-background">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(EMAIL_IDENTITIES).filter(([_, v]) => v.isPublic !== false).map(([key, identity]) => (
                                  <SelectItem key={key} value={key}>
                                    <div className="flex items-center gap-2">
                                      <Mail className="h-3 w-3 text-primary" />
                                      <span className="font-medium">{identity.address}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sender Mode</label>
                            <Select value={replySenderMode} onValueChange={(v) => setReplySenderMode(v as SenderMode)}>
                              <SelectTrigger className="h-9 bg-background">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">
                                  <div className="flex items-center gap-2">
                                    <User className="h-3 w-3 text-amber-500" />
                                    <div className="flex flex-col">
                                      <span className="font-medium">Personal Response</span>
                                      <span className="text-[10px] text-muted-foreground">Human, conversational tone</span>
                                    </div>
                                  </div>
                                </SelectItem>
                                <SelectItem value="company">
                                  <div className="flex items-center gap-2">
                                    <Building2 className="h-3 w-3 text-primary" />
                                    <div className="flex flex-col">
                                      <span className="font-medium">Official Response</span>
                                      <span className="text-[10px] text-muted-foreground">Formal, corporate tone</span>
                                    </div>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        {/* Signature Preview */}
                        <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 rounded border border-primary/20">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                          <span className="text-xs text-muted-foreground">
                            Sending as <span className="font-semibold text-foreground">{getDisplayName(replySendAs, replySenderMode)}</span> via{' '}
                            <span className="text-primary font-medium">{EMAIL_IDENTITIES[replySendAs].address}</span>
                          </span>
                        </div>
                        
                        <Textarea
                          placeholder="Type your professional response..."
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          rows={4}
                          className="resize-none focus:ring-2 focus:ring-primary/20"
                        />
                        
                        {pendingFiles.length > 0 && (
                          <div className="flex flex-wrap gap-2 p-2 bg-muted/30 rounded-lg">
                            {pendingFiles.map((file, i) => (
                              <Badge key={i} variant="secondary" className="gap-2 py-1.5 px-3">
                                <File className="h-3 w-3" />
                                <span className="max-w-32 truncate">{file.name}</span>
                                <button onClick={() => removeFile(i)} className="hover:text-destructive transition-colors">
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex gap-2">
                            <input
                              type="file"
                              ref={fileInputRef}
                              onChange={handleFileSelect}
                              className="hidden"
                              multiple
                            />
                            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                              <Paperclip className="h-4 w-4 mr-2" />
                              Attach Documents
                            </Button>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setIsReplying(false)}>
                              Cancel
                            </Button>
                            <Button 
                              onClick={sendReply} 
                              disabled={sending}
                              className={cn(
                                "min-w-32",
                                replySenderMode === 'company' && "bg-primary hover:bg-primary/90",
                                replySenderMode === 'admin' && "bg-amber-600 hover:bg-amber-700"
                              )}
                            >
                              {sending ? (
                                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <Send className="h-4 w-4 mr-2" />
                              )}
                              {replySenderMode === 'admin' ? 'Send Personal' : 'Send Official'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Button 
                        onClick={() => setIsReplying(true)} 
                        className="w-full h-11 text-base"
                        size="lg"
                      >
                        <Reply className="h-5 w-5 mr-2" />
                        Compose Reply
                      </Button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                  <h3 className="font-medium text-muted-foreground mb-2">Select an email to read</h3>
                  <p className="text-sm text-muted-foreground/60">
                    Choose from the list on the left
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Compose Dialog */}
      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Compose New Email</DialogTitle>
            <DialogDescription>
              Send a professional branded email
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Sender Configuration */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Send from inbox</label>
                  <Select value={composeSendAs} onValueChange={(v) => setComposeSendAs(v as EmailCategory)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(EMAIL_IDENTITIES).filter(([_, v]) => v.isPublic !== false).map(([key, identity]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex flex-col">
                            <span>{identity.displayName}</span>
                            <span className="text-xs text-muted-foreground">{identity.address}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sender mode</label>
                  <Select value={composeSenderMode} onValueChange={(v) => setComposeSenderMode(v as SenderMode)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-amber-500" />
                          <div className="flex flex-col">
                            <span>Admin (Personal)</span>
                            <span className="text-xs text-muted-foreground">Human tone, conversational</span>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="company">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-primary" />
                          <div className="flex flex-col">
                            <span>Company (Official)</span>
                            <span className="text-xs text-muted-foreground">Corporate, formal</span>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Preview */}
              <div className="text-xs text-muted-foreground border-t pt-3 mt-2">
                <span className="font-medium">Sender preview:</span> Email will appear from{' '}
                <span className="font-semibold text-foreground">{getDisplayName(composeSendAs, composeSenderMode)}</span>
                {' '}via <span className="text-primary">{EMAIL_IDENTITIES[composeSendAs].address}</span>
              </div>
            </div>
            
            {/* Recipient */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Recipient Email *</label>
                <Input
                  type="email"
                  placeholder="recipient@example.com"
                  value={composeRecipient}
                  onChange={(e) => setComposeRecipient(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Recipient Name</label>
                <Input
                  placeholder="John Smith"
                  value={composeRecipientName}
                  onChange={(e) => setComposeRecipientName(e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject *</label>
              <Input
                placeholder="Email subject"
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Message *</label>
              <Textarea
                placeholder="Compose your message..."
                value={composeMessage}
                onChange={(e) => setComposeMessage(e.target.value)}
                rows={8}
              />
            </div>
            
            {pendingFiles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {pendingFiles.map((file, i) => (
                  <Badge key={i} variant="secondary" className="gap-1">
                    <File className="h-3 w-3" />
                    {file.name}
                    <button onClick={() => removeFile(i)}><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" multiple />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Paperclip className="h-4 w-4 mr-2" />
                Attach Files
              </Button>
            </div>
          </div>
          
          <DialogFooter className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {composeSenderMode === 'admin' ? (
                <span className="flex items-center gap-1"><User className="h-3 w-3" /> Personal/Admin mode</span>
              ) : (
                <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> Official company mode</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setShowCompose(false)}>Cancel</Button>
              <Button onClick={createNewEmail} disabled={sending}>
                {sending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Send as {composeSenderMode === 'admin' ? 'Admin' : 'Company'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audit Log Dialog */}
      <Dialog open={showAuditLog} onOpenChange={setShowAuditLog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Audit Trail</DialogTitle>
            <DialogDescription>Complete history of actions on this thread</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            {auditLogs.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No audit logs yet</p>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className="text-xs">{log.action}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), 'PPp')}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{log.actor_email}</p>
                    {log.details && (
                      <pre className="text-xs text-muted-foreground mt-1 bg-background/50 p-2 rounded overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Forward Email Dialog */}
      <Dialog open={showForward} onOpenChange={setShowForward}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Forward className="h-5 w-5" />
              Forward Email
            </DialogTitle>
            <DialogDescription>
              Forward this conversation to another email address
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium truncate">{selectedThread?.subject}</p>
              <p className="text-xs text-muted-foreground">{messages.length} message(s) will be forwarded</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Recipient Email *</label>
                <Input
                  type="email"
                  placeholder="recipient@example.com"
                  value={forwardRecipient}
                  onChange={(e) => setForwardRecipient(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Recipient Name</label>
                <Input
                  placeholder="John Smith"
                  value={forwardRecipientName}
                  onChange={(e) => setForwardRecipientName(e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Add a Note (optional)</label>
              <Textarea
                placeholder="Add any notes for the recipient..."
                value={forwardNote}
                onChange={(e) => setForwardNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowForward(false)}>Cancel</Button>
            <Button onClick={forwardEmail} disabled={sending || !forwardRecipient.trim()}>
              {sending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Forward className="h-4 w-4 mr-2" />}
              Forward Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Onboarding Guide Dialog */}
      <Dialog open={showOnboardingGuide} onOpenChange={setShowOnboardingGuide}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Send Contractor Onboarding Guide
            </DialogTitle>
            <DialogDescription>
              Send the official outreach guide to a new contractor
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm font-medium text-primary">What's included:</p>
              <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                <li>• About Wellington EcoBuild</li>
                <li>• Launch offer (20 free Premium listings)</li>
                <li>• Phone and email scripts for outreach</li>
                <li>• Key talking points and benefits</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Recipient Email *</label>
              <Input
                type="email"
                placeholder="contractor@example.com"
                value={onboardingEmail}
                onChange={(e) => setOnboardingEmail(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Recipient Name (optional)</label>
              <Input
                placeholder="John Smith"
                value={onboardingName}
                onChange={(e) => setOnboardingName(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowOnboardingGuide(false)}>Cancel</Button>
            <Button onClick={sendOnboardingGuide} disabled={sendingOnboarding || !onboardingEmail.trim()}>
              {sendingOnboarding ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Send Guide
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
