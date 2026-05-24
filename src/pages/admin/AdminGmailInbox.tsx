import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import DOMPurify from "dompurify";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import {
  Mail,
  Inbox,
  Send,
  Search,
  RefreshCw,
  Archive,
  Trash2,
  Reply,
  MailOpen,
  Star,
  ChevronLeft,
  AlertCircle,
  User,
  PenSquare,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  Eye,
  Calendar,
  AtSign,
  FileText,
  Paperclip,
  Image,
  File,
  X,
  Upload
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GmailEmail {
  id: string;
  threadId: string;
  from: string;
  fromName: string;
  to: string;
  toName?: string;
  subject: string;
  date: string;
  snippet: string;
  body: string;
  htmlBody: string;
  labels: string[];
  hasAttachments: boolean;
  source?: 'thread' | 'contact' | 'external' | 'sent';
  direction: 'inbound' | 'outbound';
  status?: string;
  sentBy?: string;
}

interface SentEmail {
  id: string;
  to_email: string;
  to_name: string | null;
  subject: string;
  email_type: string;
  status: string;
  created_at: string;
  sent_by: string | null;
  metadata: any;
  body_html: string | null;
  body_text: string | null;
}

export default function AdminGmailInbox() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  
  const [emails, setEmails] = useState<GmailEmail[]>([]);
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<GmailEmail | null>(null);
  const [selectedSentEmail, setSelectedSentEmail] = useState<SentEmail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSent, setLoadingSent] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [totalEmails, setTotalEmails] = useState(0);
  const [totalSentEmails, setTotalSentEmails] = useState(0);
  
  // Reply
  const [showReply, setShowReply] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [sending, setSending] = useState(false);

  // Compose new message
  const [showCompose, setShowCompose] = useState(false);
  const [composeData, setComposeData] = useState({
    to: "",
    subject: "",
    body: ""
  });
  
  // Attachments
  const [attachments, setAttachments] = useState<File[]>([]);
  const [replyAttachments, setReplyAttachments] = useState<File[]>([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);

  // Email content cache to avoid refetching
  const [emailCache, setEmailCache] = useState<Record<string, GmailEmail>>({});

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, adminLoading, navigate]);

  const fetchEmails = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const { data, error: funcError } = await supabase.functions.invoke('fetch-gmail', {
        body: {
          action: 'list',
          maxResults: 50,
          query: searchQuery,
        }
      });

      if (funcError) throw funcError;
      if (data.error) throw new Error(data.error);

      const emailsWithDirection = (data.emails || []).map((email: any) => ({
        ...email,
        direction: 'inbound' as const
      }));

      setEmails(emailsWithDirection);
      setTotalEmails(data.total || 0);
      
      // Pre-cache emails with body content
      const cache: Record<string, GmailEmail> = {};
      emailsWithDirection.forEach((email: GmailEmail) => {
        if (email.body || email.htmlBody) {
          cache[email.id] = email;
        }
      });
      setEmailCache(prev => ({ ...prev, ...cache }));
      
      console.log(`[GMAIL] Fetched ${data.emails?.length || 0} emails`);
    } catch (err: any) {
      console.error('[GMAIL] Error fetching emails:', err);
      setError(err.message || 'Failed to fetch emails');
      toast.error('Failed to fetch emails', {
        description: err.message
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery]);

  const fetchSentEmails = useCallback(async () => {
    setLoadingSent(true);
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setSentEmails(data || []);
      setTotalSentEmails(data?.length || 0);
      console.log(`[GMAIL] Fetched ${data?.length || 0} sent emails`);
    } catch (err: any) {
      console.error('[GMAIL] Error fetching sent emails:', err);
      toast.error('Failed to fetch sent emails');
    } finally {
      setLoadingSent(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchEmails();
      fetchSentEmails();
    }
  }, [isAdmin, fetchEmails, fetchSentEmails]);

  const handleSelectEmail = useCallback((email: GmailEmail) => {
    // Check cache first for instant display
    const cachedEmail = emailCache[email.id];
    if (cachedEmail && (cachedEmail.body || cachedEmail.htmlBody)) {
      setSelectedEmail(cachedEmail);
      setSelectedSentEmail(null);
    } else {
      setSelectedEmail(email);
      setSelectedSentEmail(null);
    }
    
    // Fetch full content in background if needed, but don't show loading
    if (!email.body && !email.htmlBody && !emailCache[email.id]) {
      supabase.functions.invoke('fetch-gmail', {
        body: {
          action: 'get',
          messageId: email.id
        }
      }).then(({ data, error }) => {
        if (!error && data?.email) {
          const fullEmail = { ...data.email, direction: 'inbound' as const };
          setSelectedEmail(prev => prev?.id === email.id ? fullEmail : prev);
          setEmails(prev => prev.map(e => e.id === email.id ? fullEmail : e));
          setEmailCache(prev => ({ ...prev, [email.id]: fullEmail }));
        }
      }).catch(err => {
        console.error('[GMAIL] Error fetching email details:', err);
      });
    }

    // Mark as read in background
    if (!email.labels.includes('\\Seen')) {
      supabase.functions.invoke('fetch-gmail', {
        body: {
          action: 'markRead',
          messageId: email.id
        }
      }).then(() => {
        setEmails(prev => prev.map(e => 
          e.id === email.id 
            ? { ...e, labels: [...e.labels, '\\Seen'] }
            : e
        ));
      }).catch(err => {
        console.error('[GMAIL] Error marking as read:', err);
      });
    }
  }, [emailCache]);

  const handleSelectSentEmail = useCallback((email: SentEmail) => {
    setSelectedSentEmail(email);
    setSelectedEmail(null);
  }, []);

  const handleDeleteSentEmail = async (emailId: string) => {
    try {
      // Optimistically update UI first
      setSentEmails(prev => prev.filter(e => e.id !== emailId));
      if (selectedSentEmail?.id === emailId) {
        setSelectedSentEmail(null);
      }
      setTotalSentEmails(prev => Math.max(0, prev - 1));

      const { error } = await supabase
        .from('email_logs')
        .delete()
        .eq('id', emailId);

      if (error) {
        // Revert on error
        fetchSentEmails();
        throw error;
      }

      toast.success('Sent email record deleted permanently');
    } catch (err: any) {
      console.error('[GMAIL] Error deleting sent email:', err);
      toast.error('Failed to delete sent email: ' + err.message);
    }
  };

  // Handle file attachment
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, isReply: boolean = false) => {
    const files = e.target.files;
    if (!files) return;
    
    const fileArray = Array.from(files);
    const maxSize = 10 * 1024 * 1024; // 10MB per file
    const validFiles = fileArray.filter(file => {
      if (file.size > maxSize) {
        toast.error(`${file.name} is too large. Max size is 10MB.`);
        return false;
      }
      return true;
    });

    if (isReply) {
      setReplyAttachments(prev => [...prev, ...validFiles]);
    } else {
      setAttachments(prev => [...prev, ...validFiles]);
    }
    
    // Reset input
    e.target.value = '';
  };

  const removeAttachment = (index: number, isReply: boolean = false) => {
    if (isReply) {
      setReplyAttachments(prev => prev.filter((_, i) => i !== index));
    } else {
      setAttachments(prev => prev.filter((_, i) => i !== index));
    }
  };

  const uploadAttachments = async (files: File[]): Promise<string[]> => {
    if (files.length === 0) return [];
    
    setUploadingAttachments(true);
    const uploadedUrls: string[] = [];
    
    try {
      for (const file of files) {
        const fileName = `email-attachments/${Date.now()}-${file.name}`;
        const { data, error } = await supabase.storage
          .from('avatars')
          .upload(fileName, file);
        
        if (error) throw error;
        
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);
        
        uploadedUrls.push(urlData.publicUrl);
      }
      return uploadedUrls;
    } finally {
      setUploadingAttachments(false);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleArchive = async (emailId: string) => {
    try {
      await supabase.functions.invoke('fetch-gmail', {
        body: {
          action: 'archive',
          messageId: emailId
        }
      });
      
      setEmails(prev => prev.filter(e => e.id !== emailId));
      if (selectedEmail?.id === emailId) {
        setSelectedEmail(null);
      }
      toast.success('Email archived');
    } catch (err: any) {
      console.error('[GMAIL] Error archiving:', err);
      toast.error('Failed to archive email');
    }
  };

  const handleDelete = async (emailId: string) => {
    try {
      await supabase.functions.invoke('fetch-gmail', {
        body: {
          action: 'delete',
          messageId: emailId
        }
      });
      
      setEmails(prev => prev.filter(e => e.id !== emailId));
      if (selectedEmail?.id === emailId) {
        setSelectedEmail(null);
      }
      toast.success('Email deleted');
    } catch (err: any) {
      console.error('[GMAIL] Error deleting:', err);
      toast.error('Failed to delete email');
    }
  };

  const handleSendReply = async () => {
    if (!selectedEmail || !replyContent.trim()) return;
    
    setSending(true);
    try {
      // Upload attachments first
      const attachmentUrls = await uploadAttachments(replyAttachments);
      
      const emailMatch = selectedEmail.from.match(/<([^>]+)>/) || [null, selectedEmail.from];
      const toEmail = emailMatch[1] || selectedEmail.from;

      // Build attachment HTML
      const attachmentHtml = attachmentUrls.length > 0 ? `
        <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin-bottom: 10px;"><strong>Attachments (${attachmentUrls.length}):</strong></p>
          ${attachmentUrls.map((url, i) => `
            <a href="${url}" style="display: inline-block; margin-right: 10px; margin-bottom: 10px; padding: 8px 12px; background: #f3f4f6; border-radius: 6px; color: #374151; text-decoration: none; font-size: 13px;">
              📎 Attachment ${i + 1}
            </a>
          `).join('')}
        </div>
      ` : '';

      const { data, error } = await supabase.functions.invoke('fetch-gmail', {
        body: {
          action: 'reply',
          messageId: selectedEmail.id,
          to: toEmail,
          toName: selectedEmail.fromName,
          subject: selectedEmail.subject,
          html: `
            <div style="font-family: Arial, sans-serif;">
              ${replyContent.replace(/\n/g, '<br>')}
              ${attachmentHtml}
              <br><br>
              <hr style="border: none; border-top: 1px solid #ccc;">
              <div style="color: #666; font-size: 12px;">
                <p><strong>On ${format(new Date(selectedEmail.date), 'PPpp')}, ${selectedEmail.fromName} wrote:</strong></p>
                <blockquote style="border-left: 2px solid #ccc; padding-left: 10px; color: #888;">
                  ${selectedEmail.body?.substring(0, 500) || selectedEmail.snippet}
                </blockquote>
              </div>
            </div>
          `,
          text: replyContent,
          attachments: attachmentUrls
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Reply sent successfully');
      setShowReply(false);
      setReplyContent("");
      setReplyAttachments([]);
      fetchSentEmails();
    } catch (err: any) {
      console.error('[GMAIL] Error sending reply:', err);
      toast.error('Failed to send reply', {
        description: err.message
      });
    } finally {
      setSending(false);
    }
  };

  const handleSendNewEmail = async () => {
    if (!composeData.to.trim() || !composeData.subject.trim()) {
      toast.error('Please fill in recipient and subject');
      return;
    }
    
    setSending(true);
    try {
      // Upload attachments first
      const attachmentUrls = await uploadAttachments(attachments);
      
      // Build attachment HTML
      const attachmentHtml = attachmentUrls.length > 0 ? `
        <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin-bottom: 10px;"><strong>Attachments (${attachmentUrls.length}):</strong></p>
          ${attachmentUrls.map((url, i) => `
            <a href="${url}" style="display: inline-block; margin-right: 10px; margin-bottom: 10px; padding: 8px 12px; background: #f3f4f6; border-radius: 6px; color: #374151; text-decoration: none; font-size: 13px;">
              📎 Attachment ${i + 1}
            </a>
          `).join('')}
        </div>
      ` : '';

      const { data, error } = await supabase.functions.invoke('fetch-gmail', {
        body: {
          action: 'send',
          to: composeData.to,
          toName: composeData.to.split('@')[0],
          subject: composeData.subject,
          html: `<div style="font-family: Arial, sans-serif;">${composeData.body.replace(/\n/g, '<br>')}${attachmentHtml}</div>`,
          text: composeData.body,
          attachments: attachmentUrls
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Email sent successfully');
      setShowCompose(false);
      setComposeData({ to: "", subject: "", body: "" });
      setAttachments([]);
      fetchSentEmails();
    } catch (err: any) {
      console.error('[GMAIL] Error sending email:', err);
      toast.error('Failed to send email', {
        description: err.message
      });
    } finally {
      setSending(false);
    }
  };

  const filteredEmails = useMemo(() => {
    return emails.filter(email => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        email.subject.toLowerCase().includes(query) ||
        email.from.toLowerCase().includes(query) ||
        email.snippet.toLowerCase().includes(query)
      );
    });
  }, [emails, searchQuery]);

  const filteredSentEmails = useMemo(() => {
    return sentEmails.filter(email => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        email.subject.toLowerCase().includes(query) ||
        email.to_email.toLowerCase().includes(query) ||
        (email.to_name?.toLowerCase().includes(query) ?? false)
      );
    });
  }, [sentEmails, searchQuery]);

  const isUnread = (email: GmailEmail) => !email.labels.includes('\\Seen');

  const getEmailTypeLabel = (type: string) => {
    const labels: Record<string, { label: string; color: string }> = {
      'outbound': { label: 'New Email', color: 'bg-blue-500' },
      'reply': { label: 'Reply', color: 'bg-green-500' },
      'contractor_invitation': { label: 'Contractor Invite', color: 'bg-purple-500' },
      'employee_invitation': { label: 'Employee Invite', color: 'bg-orange-500' },
      'notification': { label: 'Notification', color: 'bg-gray-500' },
    };
    return labels[type] || { label: type, color: 'bg-muted' };
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'sent': 'bg-green-500/10 text-green-600 border-green-500/20',
      'delivered': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      'failed': 'bg-red-500/10 text-red-600 border-red-500/20',
      'pending': 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    };
    return colors[status] || 'bg-muted';
  };

  if (adminLoading) {
    return (
      <AdminLayout title="Gmail Inbox">
        <div className="flex items-center justify-center h-full">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Communication Center">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-card">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Communication Center</h1>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <AtSign className="h-3 w-3" />
                info@wellingtonecobuild.nz
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowCompose(true)}
              className="gap-2"
            >
              <PenSquare className="h-4 w-4" />
              Compose
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                fetchEmails(true);
                fetchSentEmails();
              }}
              disabled={refreshing}
              className="gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Tabs & Search */}
        <div className="border-b bg-muted/30">
          <div className="p-4 pb-0">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'inbox' | 'sent')}>
              <div className="flex items-center justify-between gap-4 mb-4">
                <TabsList className="grid grid-cols-2 w-[300px]">
                  <TabsTrigger value="inbox" className="gap-2">
                    <ArrowDownLeft className="h-4 w-4" />
                    Inbox
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                      {totalEmails}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="sent" className="gap-2">
                    <ArrowUpRight className="h-4 w-4" />
                    Sent
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                      {totalSentEmails}
                    </Badge>
                  </TabsTrigger>
                </TabsList>
                
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search emails..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </Tabs>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Email List */}
          <div className={cn(
            "w-full md:w-[420px] border-r flex flex-col bg-card/50",
            (selectedEmail || selectedSentEmail) && "hidden md:flex"
          )}>
            <ScrollArea className="flex-1">
              {activeTab === 'inbox' ? (
                loading ? (
                  <div className="p-4 space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="space-y-2 p-3 border rounded-lg">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    ))}
                  </div>
                ) : error ? (
                  <div className="p-8 text-center">
                    <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
                    <p className="text-destructive font-medium mb-2">Failed to load emails</p>
                    <p className="text-sm text-muted-foreground mb-4">{error}</p>
                    <Button onClick={() => fetchEmails()} variant="outline">
                      Try Again
                    </Button>
                  </div>
                ) : filteredEmails.length === 0 ? (
                  <div className="p-8 text-center">
                    <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="font-medium text-lg">No emails found</p>
                    <p className="text-sm text-muted-foreground">
                      {searchQuery ? 'Try a different search' : 'Your inbox is empty'}
                    </p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {filteredEmails.map((email) => (
                      <button
                        key={email.id}
                        onClick={() => handleSelectEmail(email)}
                        className={cn(
                          "w-full text-left p-4 rounded-lg transition-all duration-150",
                          "hover:bg-muted/80 hover:shadow-sm",
                          selectedEmail?.id === email.id && "bg-primary/10 ring-1 ring-primary/20",
                          isUnread(email) && "bg-primary/5 border-l-4 border-l-primary"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-1">
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold",
                              isUnread(email) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                            )}>
                              {email.fromName?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className={cn(
                                "truncate text-base",
                                isUnread(email) && "font-bold"
                              )}>
                                {email.fromName || 'Unknown'}
                              </span>
                              <span className="text-xs text-muted-foreground flex-shrink-0 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDistanceToNow(new Date(email.date), { addSuffix: true })}
                              </span>
                            </div>
                            <p className={cn(
                              "text-sm truncate mb-1",
                              isUnread(email) ? "font-semibold text-foreground" : "text-muted-foreground"
                            )}>
                              {email.subject || '(No subject)'}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {email.snippet}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs h-5">
                                <ArrowDownLeft className="h-3 w-3 mr-1" />
                                Received
                              </Badge>
                              {email.source === 'contact' && (
                                <Badge variant="secondary" className="text-xs h-5">
                                  Contact Form
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )
              ) : (
                loadingSent ? (
                  <div className="p-4 space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="space-y-2 p-3 border rounded-lg">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    ))}
                  </div>
                ) : filteredSentEmails.length === 0 ? (
                  <div className="p-8 text-center">
                    <Send className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="font-medium text-lg">No sent emails</p>
                    <p className="text-sm text-muted-foreground">
                      {searchQuery ? 'Try a different search' : 'You haven\'t sent any emails yet'}
                    </p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {filteredSentEmails.map((email) => {
                      const typeInfo = getEmailTypeLabel(email.email_type);
                      return (
                        <button
                          key={email.id}
                          onClick={() => handleSelectSentEmail(email)}
                          className={cn(
                            "w-full text-left p-4 rounded-lg transition-all duration-150",
                            "hover:bg-muted/80 hover:shadow-sm",
                            selectedSentEmail?.id === email.id && "bg-primary/10 ring-1 ring-primary/20"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-1">
                              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                                <ArrowUpRight className="h-5 w-5 text-green-600" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="truncate text-base font-medium">
                                  To: {email.to_name || email.to_email}
                                </span>
                                <span className="text-xs text-muted-foreground flex-shrink-0 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDistanceToNow(new Date(email.created_at), { addSuffix: true })}
                                </span>
                              </div>
                              <p className="text-sm font-medium truncate mb-1 text-foreground">
                                {email.subject || '(No subject)'}
                              </p>
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <Badge className={cn("text-xs h-5", getStatusBadge(email.status))}>
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  {email.status}
                                </Badge>
                                <Badge className={cn("text-xs h-5 text-white", typeInfo.color)}>
                                  {typeInfo.label}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )
              )}
            </ScrollArea>
          </div>

          {/* Email Detail */}
          <div className={cn(
            "flex-1 flex flex-col bg-background",
            !selectedEmail && !selectedSentEmail && "hidden md:flex"
          )}>
            {selectedEmail ? (
              <>
                {/* Email Header */}
                <div className="p-6 border-b bg-card">
                  <div className="flex items-center gap-2 mb-4 md:hidden">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedEmail(null)}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Back
                    </Button>
                  </div>
                  
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-bold mb-3">
                        {selectedEmail.subject || '(No subject)'}
                      </h2>
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-lg">{selectedEmail.fromName}</p>
                          <p className="text-sm text-muted-foreground">{selectedEmail.from}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(selectedEmail.date), 'EEEE, MMMM d, yyyy')}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-4 w-4" />
                              {format(new Date(selectedEmail.date), 'h:mm a')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setShowReply(true)}
                        className="gap-2"
                      >
                        <Reply className="h-4 w-4" />
                        Reply
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleArchive(selectedEmail.id)}
                        title="Archive"
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDelete(selectedEmail.id)}
                        title="Delete"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Email Body */}
                <ScrollArea className="flex-1">
                  <div className="p-6">
                    {selectedEmail.htmlBody ? (
                      <div 
                        className="prose prose-lg max-w-none dark:prose-invert prose-headings:font-bold prose-p:text-base prose-p:leading-relaxed"
                        style={{ fontSize: '16px', lineHeight: '1.75' }}
                        dangerouslySetInnerHTML={{ 
                          __html: DOMPurify.sanitize(selectedEmail.htmlBody, {
                            ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'div', 'span'],
                            ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'target', 'rel', 'style', 'width', 'height'],
                            ALLOW_DATA_ATTR: false,
                            FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'input', 'button', 'object', 'embed', 'svg'],
                            FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onsubmit']
                          })
                        }}
                      />
                    ) : (
                      <div className="whitespace-pre-wrap text-base leading-relaxed">
                        {selectedEmail.body || selectedEmail.snippet}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </>
            ) : selectedSentEmail ? (
              <>
                {/* Sent Email Header */}
                <div className="p-6 border-b bg-card">
                  <div className="flex items-center gap-2 mb-4 md:hidden">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedSentEmail(null)}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Back
                    </Button>
                  </div>
                  
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <Badge variant="outline" className="gap-1 text-sm py-1 px-2">
                          <ArrowUpRight className="h-4 w-4" />
                          Sent Email
                        </Badge>
                        <Badge className={cn("text-sm py-1", getStatusBadge(selectedSentEmail.status))}>
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          {selectedSentEmail.status.toUpperCase()}
                        </Badge>
                      </div>
                      <h2 className="text-xl font-bold mb-3">
                        {selectedSentEmail.subject || '(No subject)'}
                      </h2>
                      
                      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Recipient</p>
                            <p className="font-medium text-base">{selectedSentEmail.to_name || selectedSentEmail.to_email.split('@')[0]}</p>
                            <p className="text-sm text-muted-foreground">{selectedSentEmail.to_email}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Email Type</p>
                            <Badge className={cn("text-sm", getEmailTypeLabel(selectedSentEmail.email_type).color, "text-white")}>
                              {getEmailTypeLabel(selectedSentEmail.email_type).label}
                            </Badge>
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Date Sent
                            </p>
                            <p className="font-medium text-base">
                              {format(new Date(selectedSentEmail.created_at), 'EEEE, MMMM d, yyyy')}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              Time Sent
                            </p>
                            <p className="font-medium text-base">
                              {format(new Date(selectedSentEmail.created_at), 'h:mm:ss a')}
                            </p>
                          </div>
                        </div>

                        {selectedSentEmail.sent_by && (
                          <>
                            <Separator />
                            <div>
                              <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                                <User className="h-4 w-4" />
                                Sent By
                              </p>
                              <p className="font-medium text-base">{selectedSentEmail.sent_by}</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDeleteSentEmail(selectedSentEmail.id)}
                      title="Delete"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Sent Email Body & Metadata */}
                <ScrollArea className="flex-1">
                  <div className="p-6 space-y-6">
                    {/* Email Body */}
                    {(selectedSentEmail.body_html || selectedSentEmail.body_text) && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Mail className="h-5 w-5" />
                            Message Content
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {selectedSentEmail.body_html ? (
                            <div 
                              className="prose prose-sm max-w-none dark:prose-invert"
                              dangerouslySetInnerHTML={{ 
                                __html: DOMPurify.sanitize(selectedSentEmail.body_html, {
                                  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'div', 'span'],
                                  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'target', 'rel', 'style', 'width', 'height'],
                                })
                              }}
                            />
                          ) : (
                            <div className="whitespace-pre-wrap text-sm">
                              {selectedSentEmail.body_text}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* No body available message */}
                    {!selectedSentEmail.body_html && !selectedSentEmail.body_text && (
                      <Card>
                        <CardContent className="py-8">
                          <div className="text-center text-muted-foreground">
                            <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                            <p>Message content not available for this email</p>
                            <p className="text-sm mt-1">Older emails may not have content stored</p>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Attachments from metadata */}
                    {selectedSentEmail.metadata?.attachments && selectedSentEmail.metadata.attachments.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Paperclip className="h-5 w-5" />
                            Attachments ({selectedSentEmail.metadata.attachments.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {selectedSentEmail.metadata.attachments.map((url: string, i: number) => (
                              <a
                                key={i}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                              >
                                <Paperclip className="h-4 w-4" />
                                <span className="text-sm">Attachment {i + 1}</span>
                              </a>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Delivery Info */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          Delivery Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Delivery Method</p>
                            <p className="font-medium">Gmail SMTP</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Status</p>
                            <Badge className={cn("text-sm", getStatusBadge(selectedSentEmail.status))}>
                              {selectedSentEmail.status.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                        {selectedSentEmail.metadata?.reply_to_id && (
                          <div>
                            <p className="text-sm text-muted-foreground">In Reply To</p>
                            <p className="font-medium text-sm font-mono bg-muted px-2 py-1 rounded">
                              {selectedSentEmail.metadata.reply_to_id}
                            </p>
                          </div>
                        )}
                        {selectedSentEmail.metadata?.original_message_id && (
                          <div>
                            <p className="text-sm text-muted-foreground">Original Message</p>
                            <p className="font-medium text-sm font-mono bg-muted px-2 py-1 rounded">
                              {selectedSentEmail.metadata.original_message_id}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-green-800 dark:text-green-200">Email Successfully Sent</p>
                          <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                            This email was sent on {format(new Date(selectedSentEmail.created_at), 'PPpp')} to {selectedSentEmail.to_email}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted/50 flex items-center justify-center">
                    <MailOpen className="h-10 w-10 text-muted-foreground/50" />
                  </div>
                  <p className="text-xl font-medium text-muted-foreground mb-2">
                    Select an email to read
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Choose from your inbox or sent messages
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reply Dialog */}
      <Dialog open={showReply} onOpenChange={(open) => {
        setShowReply(open);
        if (!open) setReplyAttachments([]);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Reply className="h-5 w-5" />
              Reply to {selectedEmail?.fromName}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-sm space-y-1">
                <p><span className="text-muted-foreground">To:</span> {selectedEmail?.from}</p>
                <p><span className="text-muted-foreground">Subject:</span> Re: {selectedEmail?.subject}</p>
              </div>
            </div>
            <Separator />
            <Textarea
              placeholder="Write your reply..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              rows={10}
              className="resize-none text-base"
            />
            
            {/* Attachment Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Attachments</Label>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileSelect(e, true)}
                    accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  />
                  <div className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors">
                    <Upload className="h-4 w-4" />
                    Add Files
                  </div>
                </label>
              </div>
              
              {replyAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {replyAttachments.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg group"
                    >
                      {getFileIcon(file)}
                      <span className="text-sm max-w-[150px] truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground">({formatFileSize(file.size)})</span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(index, true)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReply(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendReply}
              disabled={!replyContent.trim() || sending || uploadingAttachments}
            >
              {sending || uploadingAttachments ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {uploadingAttachments ? 'Uploading...' : 'Sending...'}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Reply
                  {replyAttachments.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      <Paperclip className="h-3 w-3 mr-1" />
                      {replyAttachments.length}
                    </Badge>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Compose Dialog */}
      <Dialog open={showCompose} onOpenChange={(open) => {
        setShowCompose(open);
        if (!open) setAttachments([]);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenSquare className="h-5 w-5" />
              Compose New Email
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="compose-to" className="text-base">Recipient Email</Label>
              <Input
                id="compose-to"
                type="email"
                placeholder="recipient@example.com"
                value={composeData.to}
                onChange={(e) => setComposeData(prev => ({ ...prev, to: e.target.value }))}
                className="text-base h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="compose-subject" className="text-base">Subject</Label>
              <Input
                id="compose-subject"
                placeholder="Email subject"
                value={composeData.subject}
                onChange={(e) => setComposeData(prev => ({ ...prev, subject: e.target.value }))}
                className="text-base h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="compose-body" className="text-base">Message</Label>
              <Textarea
                id="compose-body"
                placeholder="Write your message..."
                value={composeData.body}
                onChange={(e) => setComposeData(prev => ({ ...prev, body: e.target.value }))}
                rows={10}
                className="resize-none text-base"
              />
            </div>
            
            {/* Attachment Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Attachments</Label>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileSelect(e, false)}
                    accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  />
                  <div className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors">
                    <Upload className="h-4 w-4" />
                    Add Photos, Videos & Documents
                  </div>
                </label>
              </div>
              
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
                  {attachments.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-3 py-2 bg-background rounded-lg group border"
                    >
                      {getFileIcon(file)}
                      <span className="text-sm max-w-[150px] truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground">({formatFileSize(file.size)})</span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(index, false)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
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
            <Button
              onClick={handleSendNewEmail}
              disabled={!composeData.to.trim() || !composeData.subject.trim() || sending || uploadingAttachments}
            >
              {sending || uploadingAttachments ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {uploadingAttachments ? 'Uploading...' : 'Sending...'}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Email
                  {attachments.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      <Paperclip className="h-3 w-3 mr-1" />
                      {attachments.length}
                    </Badge>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
