import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  MessageSquare,
  Mail,
  Bell,
  FileText,
  Search,
  Plus,
  Send,
  Paperclip,
  Clock,
  AlertTriangle,
  User,
  Building,
  Calendar,
  Download,
  RefreshCw,
  Megaphone,
  X,
  History,
  Upload,
  File,
  Image,
  Trash2,
  MailOpen,
  CheckCircle2,
} from "lucide-react";

interface Thread {
  id: string;
  subject: string;
  channel_type: string;
  status: string;
  priority: string;
  category: string | null;
  initiator_id: string | null;
  initiator_email: string | null;
  initiator_name: string | null;
  initiator_role: string;
  assigned_to: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  is_broadcast: boolean;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

interface Message {
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
  read_by: string | null;
  created_at: string;
}

interface Attachment {
  id: string;
  message_id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  status: string;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  version: number;
  created_at: string;
}

interface AuditLog {
  id: string;
  thread_id: string | null;
  message_id: string | null;
  attachment_id: string | null;
  action: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  old_value: any;
  new_value: any;
  details: any;
  created_at: string;
}

const statusColors: Record<string, string> = {
  unread: "bg-blue-500 text-white",
  read: "bg-muted text-muted-foreground",
  replied: "bg-admin-success text-white",
  resolved: "bg-admin-success/80 text-white",
  under_review: "bg-admin-warning text-white",
  compliance_required: "bg-admin-error text-white",
  archived: "bg-muted-foreground/50 text-white"
};

const priorityColors: Record<string, string> = {
  normal: "bg-muted text-muted-foreground",
  high: "bg-orange-500 text-white",
  urgent: "bg-admin-error text-white"
};

const channelIcons: Record<string, any> = {
  internal: MessageSquare,
  email: Mail,
  contact_form: FileText,
  system_notification: Bell,
  document_exchange: Paperclip
};

export default function AdminCommunications() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [attachments, setAttachments] = useState<Record<string, Attachment[]>>({});
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  
  // Compose
  const [showCompose, setShowCompose] = useState(false);
  const [composeSubject, setComposeSubject] = useState("");
  const [composeMessage, setComposeMessage] = useState("");
  const [composeRecipient, setComposeRecipient] = useState("");
  const [composeIsBroadcast, setComposeIsBroadcast] = useState(false);
  
  // Reply
  const [replyContent, setReplyContent] = useState("");
  
  // File uploads
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  
  // Status change
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  
  // Audit log
  const [showAuditLog, setShowAuditLog] = useState(false);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, adminLoading, navigate]);

  const fetchThreads = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('communication_threads')
        .select('*')
        .order('last_message_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (channelFilter !== 'all') {
        query = query.eq('channel_type', channelFilter);
      }
      if (priorityFilter !== 'all') {
        query = query.eq('priority', priorityFilter);
      }
      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setThreads((data || []) as Thread[]);
    } catch (error) {
      console.error('Error fetching threads:', error);
      toast.error('Failed to fetch threads');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, channelFilter, priorityFilter, categoryFilter]);

  useEffect(() => {
    if (isAdmin) {
      fetchThreads();
    }
  }, [isAdmin, fetchThreads]);

  // Auto-refresh every 5 seconds
  useAutoRefresh(useCallback(() => {
    if (isAdmin) fetchThreads();
  }, [isAdmin, fetchThreads]));

  const fetchMessages = async (threadId: string) => {
    try {
      const { data, error } = await supabase
        .from('communication_messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setMessages((data || []) as Message[]);
      
      // Fetch attachments for all messages
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
      setAuditLogs((data || []) as AuditLog[]);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    }
  };

  const selectThread = async (thread: Thread) => {
    setSelectedThread(thread);
    await fetchMessages(thread.id);
    
    // Mark as read if unread
    if (thread.status === 'unread') {
      await supabase
        .from('communication_threads')
        .update({ status: 'read' })
        .eq('id', thread.id);
      
      setThreads(prev => prev.map(t => 
        t.id === thread.id ? { ...t, status: 'read' } : t
      ));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => f.size <= 10 * 1024 * 1024); // 10MB limit
    if (validFiles.length < files.length) {
      toast.error('Some files were too large (max 10MB)');
    }
    setPendingFiles(prev => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFilesForMessage = async (messageId: string) => {
    if (pendingFiles.length === 0) return;
    
    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      for (const file of pendingFiles) {
        const timestamp = Date.now();
        const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `${userData.user?.id}/${selectedThread?.id}/${timestamp}_${safeFileName}`;
        
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
      }
      setPendingFiles([]);
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload some files');
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
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data: msgData, error } = await supabase
        .from('communication_messages')
        .insert({
          thread_id: selectedThread.id,
          sender_id: userData.user?.id,
          sender_email: 'info@wellingtonecobuild.nz',
          sender_name: 'Wellington EcoBuild Admin',
          sender_role: 'admin',
          content: replyContent || 'Attachment'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Upload files if any
      if (pendingFiles.length > 0 && msgData) {
        await uploadFilesForMessage(msgData.id);
      }
      
      // Update thread status
      await supabase
        .from('communication_threads')
        .update({ 
          status: 'replied',
          last_message_at: new Date().toISOString()
        })
        .eq('id', selectedThread.id);
      
      // Send email notification to recipient if they have an email
      if (selectedThread.initiator_email && msgData?.id) {
        const { data: emailData, error: emailError } = await supabase.functions.invoke('send-communication-email', {
          body: {
            thread_id: selectedThread.id,
            message_id: msgData.id,
            recipient_email: selectedThread.initiator_email,
            recipient_name: selectedThread.initiator_name || 'Valued Customer',
            subject: `Re: ${selectedThread.subject}`,
            message_content: replyContent,
            sender_name: 'Wellington EcoBuild Admin',
            sender_email: 'info@wellingtonecobuild.nz',
            reply_type: 'admin_reply'
          }
        });

        if (emailError) {
          console.error('Failed to send email notification:', emailError);
          toast.error('Message saved, but email delivery failed');
        } else if ((emailData as any)?.success) {
          toast.success('Email delivered');
        }
      }
      
      setReplyContent("");
      await fetchMessages(selectedThread.id);
      toast.success('Reply sent & email notification delivered');
      
      // Refresh threads
      fetchThreads();
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const createThread = async () => {
    if (!composeSubject.trim() || !composeMessage.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    
    if (!composeIsBroadcast && !composeRecipient.trim()) {
      toast.error('Please enter a recipient email');
      return;
    }
    
    setSending(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      // Look up user ID from email if not a broadcast
      let recipientUserId: string | null = null;
      const recipientEmail = composeRecipient.trim().toLowerCase();

      if (!composeIsBroadcast && recipientEmail) {
        // Try to find user by email in profiles or businesses (case-insensitive)
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email')
          .ilike('email', recipientEmail)
          .maybeSingle();

        if (profile?.id) {
          recipientUserId = profile.id;
        } else {
          // Try businesses
          const { data: business } = await supabase
            .from('businesses')
            .select('owner_id, email')
            .ilike('email', recipientEmail)
            .maybeSingle();

          if (business?.owner_id) {
            recipientUserId = business.owner_id;
          }
        }
      }
      
      // Create thread
      const { data: threadData, error: threadError } = await supabase
        .from('communication_threads')
        .insert({
          subject: composeSubject,
          channel_type: 'internal',
          status: 'unread',
          priority: 'normal',
          initiator_id: userData.user?.id,
          initiator_email: 'info@wellingtonecobuild.nz',
          initiator_name: 'Wellington EcoBuild Admin',
          initiator_role: 'admin',
          is_broadcast: composeIsBroadcast,
          category: 'general'
        })
        .select()
        .single();
      
      if (threadError) throw threadError;
      
      // Create initial message
      const { data: msgData, error: msgError } = await supabase
        .from('communication_messages')
        .insert({
          thread_id: threadData.id,
          sender_id: userData.user?.id,
          sender_email: 'info@wellingtonecobuild.nz',
          sender_name: 'Wellington EcoBuild Admin',
          sender_role: 'admin',
          content: composeMessage
        })
        .select()
        .single();
      
      if (msgError) throw msgError;
      
      // Upload pending files if any
      if (pendingFiles.length > 0 && msgData) {
        await uploadFilesForMessage(msgData.id);
      }
      
      // If not broadcast, add recipient as participant (email fallback so it still appears in Inbox)
      if (!composeIsBroadcast && recipientEmail) {
        await supabase
          .from('communication_participants')
          .insert({
            thread_id: threadData.id,
            user_id: recipientUserId,
            user_email: recipientEmail,
            user_role: 'user',
            can_reply: true,
          });

        // Also send an email notification (so it arrives in the recipient's inbox)
        if (msgData?.id) {
          const { error: emailError } = await supabase.functions.invoke('send-communication-email', {
            body: {
              thread_id: threadData.id,
              message_id: msgData.id,
              recipient_email: recipientEmail,
              recipient_name: 'Valued Customer',
              subject: composeSubject,
              message_content: composeMessage,
              sender_name: 'Wellington EcoBuild Admin',
              sender_email: 'info@wellingtonecobuild.nz',
              reply_type: 'admin_reply'
            }
          });

          if (emailError) {
            console.error('Failed to send email for new thread:', emailError);
            toast.error('Message saved, but email delivery failed');
          }
        }
      }
      
      setShowCompose(false);
      setComposeSubject("");
      setComposeMessage("");
      setComposeRecipient("");
      setComposeIsBroadcast(false);
      setPendingFiles([]);
      
      toast.success(composeIsBroadcast ? 'Broadcast sent' : 'Message sent');
      fetchThreads();
    } catch (error) {
      console.error('Error creating thread:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const updateThreadStatus = async () => {
    if (!selectedThread || !newStatus) return;
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const updateData: any = { status: newStatus };
      if (newStatus === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = userData.user?.id;
      }
      
      await supabase
        .from('communication_threads')
        .update(updateData)
        .eq('id', selectedThread.id);
      
      setSelectedThread({ ...selectedThread, ...updateData });
      setShowStatusDialog(false);
      toast.success('Status updated');
      fetchThreads();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const deleteThread = async (threadId: string) => {
    try {
      // First delete all messages and attachments
      const { data: messages } = await supabase
        .from('communication_messages')
        .select('id')
        .eq('thread_id', threadId);
      
      if (messages && messages.length > 0) {
        const messageIds = messages.map(m => m.id);
        await supabase
          .from('communication_attachments')
          .delete()
          .in('message_id', messageIds);
        
        await supabase
          .from('communication_messages')
          .delete()
          .eq('thread_id', threadId);
      }

      // Delete participants
      await supabase
        .from('communication_participants')
        .delete()
        .eq('thread_id', threadId);

      // Delete audit logs
      await supabase
        .from('communication_audit_log')
        .delete()
        .eq('thread_id', threadId);
      
      // Delete the thread
      const { error } = await supabase
        .from('communication_threads')
        .delete()
        .eq('id', threadId);
      
      if (error) throw error;
      
      setThreads(threads.filter(t => t.id !== threadId));
      if (selectedThread?.id === threadId) {
        setSelectedThread(null);
        setMessages([]);
      }
      toast.success('Thread deleted successfully');
    } catch (error) {
      console.error('Error deleting thread:', error);
      toast.error('Failed to delete thread');
    }
  };

  const filteredThreads = threads.filter(thread => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      thread.subject.toLowerCase().includes(query) ||
      thread.initiator_email?.toLowerCase().includes(query) ||
      thread.initiator_name?.toLowerCase().includes(query)
    );
  });

  const getChannelIcon = (type: string) => {
    const Icon = channelIcons[type] || MessageSquare;
    return <Icon className="h-4 w-4" />;
  };

  const stats = {
    total: threads.length,
    unread: threads.filter(t => t.status === 'unread').length,
    pending: threads.filter(t => ['under_review', 'compliance_required'].includes(t.status)).length,
    urgent: threads.filter(t => t.priority === 'urgent').length
  };

  if (adminLoading) {
    return (
    <AdminLayout title="Communications Hub">
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Communications Hub">
      <div className="space-y-6">
        {/* Header */}
        <AdminPageHeader
          title="Communications Hub"
          subtitle="Unified messaging, emails, and notifications"
          icon={Mail}
          onRefresh={fetchThreads}
          refreshing={loading}
          actions={
            <Button onClick={() => setShowCompose(true)} className="bg-admin-teal hover:bg-admin-teal-dark">
              <Plus className="h-4 w-4 mr-2" />
              New Message
            </Button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border-admin-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-admin-navy/10">
                  <MessageSquare className="h-5 w-5 text-admin-navy" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono tabular-nums">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Threads</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={`border-admin-border ${stats.unread > 0 ? 'border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/10' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <MailOpen className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono tabular-nums text-blue-600">{stats.unread}</p>
                  <p className="text-xs text-muted-foreground">Unread</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={`border-admin-border ${stats.pending > 0 ? 'border-admin-warning/30 bg-amber-50/50 dark:bg-amber-950/10' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-admin-warning/10">
                  <Clock className="h-5 w-5 text-admin-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono tabular-nums text-admin-warning">{stats.pending}</p>
                  <p className="text-xs text-muted-foreground">Pending Review</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={`border-admin-border ${stats.urgent > 0 ? 'border-admin-error/30 bg-red-50/50 dark:bg-red-950/10' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-admin-error/10">
                  <AlertTriangle className="h-5 w-5 text-admin-error" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono tabular-nums text-admin-error">{stats.urgent}</p>
                  <p className="text-xs text-muted-foreground">Urgent</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-12 gap-4 h-[calc(100vh-320px)]">
          {/* Thread List */}
          <Card className="col-span-4 flex flex-col">
            <CardHeader className="pb-2 space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search threads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              {/* Filters */}
              <div className="grid grid-cols-2 gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="unread">Unread</SelectItem>
                    <SelectItem value="read">Read</SelectItem>
                    <SelectItem value="replied">Replied</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={channelFilter} onValueChange={setChannelFilter}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Channel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Channels</SelectItem>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="contact_form">Contact Form</SelectItem>
                    <SelectItem value="system_notification">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 p-0 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="divide-y divide-admin-border">
                  {filteredThreads.map((thread) => (
                    <div
                      key={thread.id}
                      className={`group relative p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedThread?.id === thread.id ? 'bg-admin-teal/5 border-l-2 border-admin-teal' : ''
                      } ${thread.status === 'unread' ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}
                    >
                      <div className="flex items-start gap-3" onClick={() => selectThread(thread)}>
                        <div className="mt-1 text-muted-foreground flex-shrink-0">
                          {getChannelIcon(thread.channel_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm truncate">
                              {thread.subject || '(No Subject)'}
                            </span>
                            {thread.priority !== 'normal' && (
                              <Badge className={`${priorityColors[thread.priority]} text-[10px] px-1.5 h-5`}>
                                {thread.priority}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate font-medium">
                            {thread.initiator_name || thread.initiator_email || 'Unknown Sender'}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Badge variant="outline" className="text-[10px] px-1.5 h-5 capitalize">
                              {thread.channel_type.replace(/_/g, ' ')}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(thread.last_message_at), 'MMM d, HH:mm')}
                            </span>
                            <Badge className={`text-[10px] px-1.5 h-5 ${statusColors[thread.status]}`}>
                              {thread.status.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                        </div>
                        {/* Delete button */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0 text-admin-error hover:text-admin-error hover:bg-admin-error/10"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Thread</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{thread.subject}"? This will permanently delete all messages and attachments. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteThread(thread.id)}
                                className="bg-admin-error text-white hover:bg-admin-error/90"
                              >
                                Delete Thread
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                  
                  {filteredThreads.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                      <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-admin-success/30" />
                      <p className="text-sm font-medium">No threads found</p>
                      <p className="text-xs text-muted-foreground mt-1">All caught up!</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Thread Detail */}
          <Card className="col-span-8 flex flex-col">
            {selectedThread ? (
              <>
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{selectedThread.subject}</CardTitle>
                      <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          {selectedThread.initiator_name || selectedThread.initiator_email}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(selectedThread.created_at), 'MMM d, yyyy HH:mm')}
                        </div>
                        {selectedThread.related_entity_type && (
                          <div className="flex items-center gap-1">
                            <Building className="h-3.5 w-3.5" />
                            {selectedThread.related_entity_type}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${statusColors[selectedThread.status]}`}>
                        {selectedThread.status.replace(/_/g, ' ')}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-admin-border"
                        onClick={() => {
                          setNewStatus(selectedThread.status);
                          setShowStatusDialog(true);
                        }}
                      >
                        Change Status
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          fetchAuditLogs(selectedThread.id);
                          setShowAuditLog(true);
                        }}
                        title="View Audit Log"
                      >
                        <History className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-admin-error hover:text-admin-error hover:bg-admin-error/10"
                            title="Delete Thread"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Thread</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this thread? This will permanently delete all messages and attachments. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteThread(selectedThread.id)}
                              className="bg-admin-error text-white hover:bg-admin-error/90"
                            >
                              Delete Thread
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`p-4 rounded-lg ${
                            message.sender_role === 'admin' 
                              ? 'bg-primary/5 ml-8' 
                              : message.is_system_message
                              ? 'bg-muted text-center'
                              : 'bg-muted/50 mr-8'
                          }`}
                        >
                          {!message.is_system_message && (
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">
                                  {message.sender_name || message.sender_email || 'System'}
                                </span>
                                <Badge variant="outline" className="text-[10px]">
                                  {message.sender_role}
                                </Badge>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(message.created_at), 'MMM d, HH:mm')}
                              </span>
                            </div>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          
                          {/* Attachments */}
                          {attachments[message.id] && attachments[message.id].length > 0 && (
                            <div className="mt-3 pt-3 border-t space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">Attachments</p>
                              {attachments[message.id].map((att) => (
                                <div key={att.id} className="flex items-center justify-between p-2 bg-background rounded border">
                                  <div className="flex items-center gap-2">
                                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{att.file_name}</span>
                                    <Badge variant="outline" className="text-[10px]">
                                      {att.status}
                                    </Badge>
                                  </div>
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => downloadAttachment(att)}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  
                  {/* Reply Box */}
                  <div className="p-4 border-t">
                    {/* Pending files */}
                    {pendingFiles.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {pendingFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg text-sm"
                          >
                            {file.type.startsWith('image/') ? (
                              <Image className="h-4 w-4" />
                            ) : (
                              <File className="h-4 w-4" />
                            )}
                            <span className="truncate max-w-[150px]">{file.name}</span>
                            <button
                              onClick={() => removeFile(index)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Type your reply..."
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        className="min-h-[80px] resize-none"
                      />
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <div>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileSelect}
                          className="hidden"
                          multiple
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                        >
                          <Upload className="h-4 w-4 mr-1" />
                          Attach Files
                        </Button>
                      </div>
                      <Button 
                        onClick={sendReply} 
                        disabled={(!replyContent.trim() && pendingFiles.length === 0) || sending || uploading}
                      >
                        {sending || uploading ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        {uploading ? 'Uploading...' : 'Send Reply'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Select a thread to view</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Compose Dialog */}
      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
            <DialogDescription>
              Send a message to a user or broadcast to all.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Button
                variant={composeIsBroadcast ? "default" : "outline"}
                size="sm"
                onClick={() => setComposeIsBroadcast(true)}
              >
                <Megaphone className="h-4 w-4 mr-1" />
                Broadcast
              </Button>
              <Button
                variant={!composeIsBroadcast ? "default" : "outline"}
                size="sm"
                onClick={() => setComposeIsBroadcast(false)}
              >
                <User className="h-4 w-4 mr-1" />
                Direct
              </Button>
            </div>
            
            {!composeIsBroadcast && (
              <Input
                placeholder="Recipient email"
                value={composeRecipient}
                onChange={(e) => setComposeRecipient(e.target.value)}
              />
            )}
            
            <Input
              placeholder="Subject"
              value={composeSubject}
              onChange={(e) => setComposeSubject(e.target.value)}
            />
            
            <Textarea
              placeholder="Message content..."
              value={composeMessage}
              onChange={(e) => setComposeMessage(e.target.value)}
              className="min-h-[150px]"
            />
            
            {/* File attachments */}
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                multiple
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4 mr-2" />
                Attach Files
              </Button>
              
              {pendingFiles.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {pendingFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg text-sm"
                    >
                      <File className="h-4 w-4" />
                      <span className="truncate max-w-[150px]">{file.name}</span>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompose(false)}>
              Cancel
            </Button>
            <Button onClick={createThread} disabled={sending}>
              {sending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Thread Status</DialogTitle>
          </DialogHeader>
          
          <Select value={newStatus} onValueChange={setNewStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unread">Unread</SelectItem>
              <SelectItem value="read">Read</SelectItem>
              <SelectItem value="replied">Replied</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
              <SelectItem value="compliance_required">Compliance Required</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
              Cancel
            </Button>
            <Button onClick={updateThreadStatus}>
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audit Log Dialog */}
      <Dialog open={showAuditLog} onOpenChange={setShowAuditLog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Audit Log</DialogTitle>
            <DialogDescription>
              Complete history of actions on this thread
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {auditLogs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No audit logs yet</p>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{log.action}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
                      </span>
                    </div>
                    <p className="text-sm mt-1 text-muted-foreground">
                      By: {log.actor_email || log.actor_role || 'System'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
