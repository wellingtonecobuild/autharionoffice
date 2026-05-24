import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePortalUser } from '@/hooks/usePortalUser';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';
import { format, formatDistanceToNow } from 'date-fns';
import DOMPurify from 'dompurify';
import {
  Building2,
  Mail,
  Inbox,
  Send,
  Search,
  RefreshCw,
  Reply,
  ChevronLeft,
  User,
  PenSquare,
  ArrowLeft,
  Clock,
  CheckCircle2,
  Paperclip,
  Image,
  File,
  X,
  Upload,
  MessageSquare,
  Plus,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProfessionalEmailComposer, EmailData } from '@/components/portal/ProfessionalEmailComposer';

interface Message {
  id: string;
  thread_id: string;
  content: string;
  html_content: string | null;
  sender_role: string;
  sender_name: string | null;
  sender_email: string | null;
  created_at: string;
  read_at: string | null;
}

interface Thread {
  id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  last_message_at: string | null;
  channel_type: string;
  initiator_role: string;
  initiator_name: string | null;
  initiator_id: string | null;
  category: string | null;
  external_recipient_email?: string | null;
  external_recipient_name?: string | null;
  messages?: Message[];
}

interface SentMessage {
  id: string;
  to_email: string;
  to_name: string | null;
  subject: string;
  email_type: string;
  status: string;
  created_at: string;
  body_html: string | null;
  body_text: string | null;
  metadata: any;
}

export default function PortalCommunication() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { portalUser, loading: portalLoading } = usePortalUser();
  
  const [threads, setThreads] = useState<Thread[]>([]);
  const [sentMessages, setSentMessages] = useState<SentMessage[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Reply & Compose
  const [showReply, setShowReply] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [composeData, setComposeData] = useState({ subject: '', body: '' });
  const [sending, setSending] = useState(false);
  
  // Direct Email
  const [showDirectEmail, setShowDirectEmail] = useState(false);
  const [directEmailData, setDirectEmailData] = useState({ to: '', toName: '', subject: '', body: '' });
  
  // Attachments
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);

  useEffect(() => {
    if (!portalLoading && !portalUser) {
      navigate('/portal/login');
    }
  }, [portalUser, portalLoading, navigate]);

  const fetchThreads = useCallback(async (refresh = false) => {
    if (!portalUser) return;
    
    if (refresh) setRefreshing(true);
    else setLoading(true);

    try {
      // Fetch threads where the portal user is a participant
      const { data: participations, error: partError } = await supabase
        .from('communication_participants')
        .select('thread_id')
        .eq('user_id', user?.id);

      if (partError) throw partError;

      // Also fetch threads where the user initiated (for email threads they created)
      const { data: initiatedThreads, error: initError } = await supabase
        .from('communication_threads')
        .select(`
          *,
          messages:communication_messages(*)
        `)
        .eq('initiator_id', user?.id)
        .order('last_message_at', { ascending: false });

      if (initError) throw initError;

      let participatedThreads: Thread[] = [];
      if (participations && participations.length > 0) {
        const threadIds = participations.map(p => p.thread_id);
        
        const { data: threadData, error: threadError } = await supabase
          .from('communication_threads')
          .select(`
            *,
            messages:communication_messages(*)
          `)
          .in('id', threadIds)
          .order('last_message_at', { ascending: false });

        if (threadError) throw threadError;
        participatedThreads = threadData || [];
      }

      // Merge and dedupe threads
      const allThreads = [...(initiatedThreads || []), ...participatedThreads];
      const uniqueThreads = allThreads.reduce((acc: Thread[], current) => {
        if (!acc.find(t => t.id === current.id)) {
          acc.push(current);
        }
        return acc;
      }, []);

      // Sort by last_message_at
      uniqueThreads.sort((a, b) => {
        const dateA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
        const dateB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
        return dateB - dateA;
      });

      setThreads(uniqueThreads);
    } catch (err: any) {
      console.error('Error fetching threads:', err);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [portalUser, user?.id]);

  const fetchSentMessages = useCallback(async () => {
    if (!portalUser) return;

    try {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .eq('sent_by', user?.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setSentMessages(data || []);
    } catch (err: any) {
      console.error('Error fetching sent messages:', err);
    }
  }, [portalUser, user?.id]);

  // Handle URL search params for auto-opening compose
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (portalUser) {
      fetchThreads();
      fetchSentMessages();
    }
  }, [portalUser, fetchThreads, fetchSentMessages]);

  // Auto-open compose dialog if compose=true in URL
  useEffect(() => {
    if (searchParams.get('compose') === 'true' && portalUser) {
      setShowDirectEmail(true);
      // Clear the param so it doesn't re-open on refresh
      setSearchParams({});
    }
  }, [searchParams, portalUser, setSearchParams]);

  const handleSelectThread = async (thread: Thread) => {
    setSelectedThread(thread);
    
    // Mark messages as read
    if (thread.messages) {
      const unreadMessages = thread.messages.filter(
        m => !m.read_at && m.sender_role !== 'contractor'
      );
      
      for (const msg of unreadMessages) {
        await supabase
          .from('communication_messages')
          .update({ read_at: new Date().toISOString(), read_by: user?.id })
          .eq('id', msg.id);
      }
    }
  };

  const uploadAttachments = async (files: File[]): Promise<string[]> => {
    if (files.length === 0) return [];
    
    setUploadingAttachments(true);
    const uploadedUrls: string[] = [];
    
    try {
      for (const file of files) {
        const fileName = `portal-attachments/${portalUser?.id}/${Date.now()}-${file.name}`;
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

  const handleSendReply = async () => {
    if (!selectedThread || !replyContent.trim()) return;
    
    setSending(true);
    try {
      const attachmentUrls = await uploadAttachments(attachments);
      
      // Create reply message
      const { data: messageData, error } = await supabase
        .from('communication_messages')
        .insert({
          thread_id: selectedThread.id,
          content: replyContent,
          html_content: replyContent.replace(/\n/g, '<br>'),
          sender_role: 'contractor',
          sender_id: user?.id,
          sender_email: portalUser?.email,
          sender_name: portalUser?.legal_full_name || portalUser?.email
        })
        .select()
        .single();

      if (error) throw error;

      // Update thread last_message_at
      await supabase
        .from('communication_threads')
        .update({ last_message_at: new Date().toISOString(), status: 'active' })
        .eq('id', selectedThread.id);

      // Check if this is a client email thread - if so, forward reply to client (branded)
      const isClientEmailThread = selectedThread.category === 'client_email' || 
        (selectedThread.channel_type === 'email' && selectedThread.external_recipient_email);
      
      if (isClientEmailThread && selectedThread.external_recipient_email) {
        // Forward the reply to the client using the relay system
        // Client will receive a branded email, contractor's personal email stays hidden
        try {
          await supabase.functions.invoke('forward-to-client', {
            body: {
              clientEmail: selectedThread.external_recipient_email,
              clientName: selectedThread.external_recipient_name || selectedThread.external_recipient_email,
              contractorName: portalUser?.legal_full_name || portalUser?.email || 'Contractor',
              contractorId: user?.id,
              subject: selectedThread.subject.replace(/^RE:\s*/i, ''), // Clean subject
              messageText: replyContent,
              threadId: selectedThread.id,
              messageId: messageData?.id
            }
          });
          toast.success('Reply sent to client - Your email is protected!');
        } catch (forwardError) {
          console.error('Forward to client failed:', forwardError);
          // Still show success for portal message even if email forward fails
          toast.success('Reply saved (email delivery in progress)');
        }
      } else {
        toast.success('Reply sent successfully');
      }

      // Send notification to admin about the reply
      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            type: 'reply_received',
            recipient_email: 'info@wellingtonecobuild.nz',
            recipient_name: 'Admin',
            recipient_type: 'admin',
            sender_name: portalUser?.legal_full_name || portalUser?.email || 'Contractor',
            sender_email: portalUser?.email,
            subject: `Reply: ${selectedThread.subject}`,
            message_preview: replyContent.substring(0, 200),
            thread_id: selectedThread.id,
            metadata: {
              message_id: messageData?.id,
              contractor_email: portalUser?.email,
              forwarded_to_client: isClientEmailThread
            }
          }
        });
      } catch (notifyError) {
        console.log('Notification failed (non-blocking):', notifyError);
      }

      setShowReply(false);
      setReplyContent('');
      setAttachments([]);
      fetchThreads(true);
    } catch (err: any) {
      console.error('Error sending reply:', err);
      toast.error('Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const handleSendNewMessage = async () => {
    if (!composeData.subject.trim() || !composeData.body.trim()) {
      toast.error('Please fill in subject and message');
      return;
    }
    
    setSending(true);
    try {
      const attachmentUrls = await uploadAttachments(attachments);
      
      // Create new thread
      const { data: thread, error: threadError } = await supabase
        .from('communication_threads')
        .insert({
          subject: composeData.subject,
          channel_type: 'portal',
          initiator_id: user?.id,
          initiator_email: portalUser?.email,
          initiator_name: portalUser?.legal_full_name || portalUser?.email,
          initiator_role: 'contractor',
          status: 'open',
          priority: 'normal',
          category: 'portal_inquiry',
          last_message_at: new Date().toISOString()
        })
        .select()
        .single();

      if (threadError) throw threadError;

      // Add the message
      const { data: messageData } = await supabase
        .from('communication_messages')
        .insert({
          thread_id: thread.id,
          content: composeData.body,
          html_content: composeData.body.replace(/\n/g, '<br>'),
          sender_role: 'contractor',
          sender_id: user?.id,
          sender_email: portalUser?.email,
          sender_name: portalUser?.legal_full_name || portalUser?.email
        })
        .select()
        .single();

      // Add contractor as participant
      await supabase
        .from('communication_participants')
        .insert({
          thread_id: thread.id,
          user_id: user?.id,
          user_email: portalUser?.email,
          user_role: 'contractor'
        });

      // Send notification to admin about new message
      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            type: 'new_message',
            recipient_email: 'info@wellingtonecobuild.nz',
            recipient_name: 'Admin',
            recipient_type: 'admin',
            sender_name: portalUser?.legal_full_name || portalUser?.email || 'Contractor',
            sender_email: portalUser?.email,
            subject: composeData.subject,
            message_preview: composeData.body.substring(0, 200),
            thread_id: thread.id,
            metadata: {
              message_id: messageData?.id,
              contractor_email: portalUser?.email
            }
          }
        });
      } catch (notifyError) {
        console.log('Notification failed (non-blocking):', notifyError);
      }

      toast.success('Message sent to admin');
      setShowCompose(false);
      setComposeData({ subject: '', body: '' });
      setAttachments([]);
      fetchThreads(true);
    } catch (err: any) {
      console.error('Error sending message:', err);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleSendDirectEmail = async (data: EmailData) => {
    setSending(true);
    try {
      // Send email via send-email function with full data including sender info for thread creation
      const response = await supabase.functions.invoke('send-email', {
        body: {
          to: data.to,
          toName: data.toName || data.to,
          subject: data.subject,
          body: data.body,
          senderName: portalUser?.legal_full_name || portalUser?.email,
          attachments: data.attachments,
          links: data.links,
          // These are used to create the communication thread for reply tracking
          senderId: user?.id,
          senderEmail: portalUser?.email
        }
      });

      if (response.error) throw response.error;

      toast.success(`Email sent to ${data.to} - Replies will appear in your inbox`);
      setShowDirectEmail(false);
      
      // Refresh both threads and sent messages
      fetchThreads(true);
      fetchSentMessages();
    } catch (err: any) {
      console.error('Error sending email:', err);
      toast.error('Failed to send email');
      throw err;
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const fileArray = Array.from(files);
    const maxSize = 10 * 1024 * 1024;
    const validFiles = fileArray.filter(file => {
      if (file.size > maxSize) {
        toast.error(`${file.name} is too large. Max 10MB.`);
        return false;
      }
      return true;
    });

    setAttachments(prev => [...prev, ...validFiles]);
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
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

  const filteredThreads = threads.filter(t => 
    t.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLogout = async () => {
    await signOut();
    navigate('/portal/login');
  };

  if (portalLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Messages | Wellington EcoBuild Portal</title>
      </Helmet>

      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-3">
                <Link to="/portal/dashboard" className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-600 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="font-semibold text-slate-900">Wellington EcoBuild</h1>
                    <p className="text-xs text-slate-500">Contractor Portal</p>
                  </div>
                </Link>
              </div>
              <div className="flex items-center gap-4">
                <Link to="/portal/dashboard">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
                <Link to="/portal/profile">
                  <Button variant="ghost" size="sm">
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Communication Hub Info Banner */}
          <Card className="mb-6 bg-gradient-to-r from-emerald-50 to-blue-50 border-emerald-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Mail className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-emerald-900">Professional Communication Hub</h3>
                  <p className="text-sm text-emerald-700 mt-1">
                    Send professional branded emails to builders, clients & construction companies. 
                    <strong className="text-emerald-800"> Your personal email is protected</strong> - all emails appear from Wellington EcoBuild.
                    When clients reply, their responses come directly to your inbox here AND to your personal email (branded).
                  </p>
                  <div className="flex flex-wrap gap-4 mt-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                      <span className="text-slate-600">Blue = Client replies</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-slate-600">Green = Your messages</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Shield className="h-3 w-3 text-amber-600" />
                      <span className="text-slate-600">Email privacy protected</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Page Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Messages</h2>
              <p className="text-slate-500">Communicate with clients, builders & Wellington EcoBuild</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchThreads(true)}
                disabled={refreshing}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDirectEmail(true)}
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => setShowCompose(true)}
              >
                <PenSquare className="h-4 w-4 mr-2" />
                Internal Message
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Thread List */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader className="pb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search messages..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Tabs defaultValue="inbox" onValueChange={(v) => setActiveTab(v as 'inbox' | 'sent')}>
                    <TabsList className="w-full rounded-none border-b">
                      <TabsTrigger value="inbox" className="flex-1">
                        <Inbox className="h-4 w-4 mr-2" />
                        Inbox ({filteredThreads.length})
                      </TabsTrigger>
                      <TabsTrigger value="sent" className="flex-1">
                        <Send className="h-4 w-4 mr-2" />
                        Sent ({sentMessages.length})
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="inbox" className="m-0">
                      <ScrollArea className="h-[500px]">
                        {filteredThreads.length === 0 ? (
                          <div className="p-8 text-center">
                            <MessageSquare className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                            <p className="text-slate-500">No messages yet</p>
                            <Button 
                              variant="outline" 
                              className="mt-4"
                              onClick={() => setShowCompose(true)}
                            >
                              Start a conversation
                            </Button>
                          </div>
                        ) : (
                          <div className="divide-y">
                            {filteredThreads.map((thread) => {
                              const lastMessage = thread.messages?.[thread.messages.length - 1];
                              const hasUnread = thread.messages?.some(
                                m => !m.read_at && m.sender_role !== 'contractor'
                              );
                              const isEmailThread = thread.channel_type === 'email';
                              const isClientEmail = thread.category === 'client_email';
                              
                              return (
                                <button
                                  key={thread.id}
                                  onClick={() => handleSelectThread(thread)}
                                  className={cn(
                                    "w-full p-4 text-left hover:bg-slate-50 transition-colors",
                                    selectedThread?.id === thread.id && "bg-emerald-50 border-l-4 border-emerald-500",
                                    hasUnread && "bg-blue-50"
                                  )}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        {isEmailThread || isClientEmail ? (
                                          <Mail className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                                        ) : (
                                          <MessageSquare className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                                        )}
                                        <p className={cn(
                                          "text-sm truncate",
                                          hasUnread ? "font-bold text-slate-900" : "font-medium text-slate-700"
                                        )}>
                                          {thread.subject}
                                        </p>
                                      </div>
                                      <p className="text-xs text-slate-500 truncate">
                                        {isClientEmail && (thread as any).external_recipient_name 
                                          ? `To: ${(thread as any).external_recipient_name}` 
                                          : lastMessage?.content?.substring(0, 50) || 'No messages'}...
                                      </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                      <span className="text-xs text-slate-400">
                                        {thread.last_message_at 
                                          ? formatDistanceToNow(new Date(thread.last_message_at), { addSuffix: true })
                                          : 'Just now'
                                        }
                                      </span>
                                      <div className="flex items-center gap-1">
                                        {isClientEmail && (
                                          <Badge variant="outline" className="text-[10px] px-1 py-0 border-blue-300 text-blue-600">
                                            Client
                                          </Badge>
                                        )}
                                        {hasUnread && (
                                          <Badge className="bg-emerald-500 text-white text-xs px-1.5">New</Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="sent" className="m-0">
                      <ScrollArea className="h-[500px]">
                        {sentMessages.length === 0 ? (
                          <div className="p-8 text-center">
                            <Send className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                            <p className="text-slate-500">No sent messages</p>
                          </div>
                        ) : (
                          <div className="divide-y">
                            {sentMessages.map((msg) => (
                              <div
                                key={msg.id}
                                className="p-4 hover:bg-slate-50"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-700 truncate">
                                      {msg.subject}
                                    </p>
                                    <p className="text-xs text-slate-500 truncate mt-1">
                                      To: {msg.to_name || msg.to_email}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {msg.status}
                                    </Badge>
                                    <span className="text-xs text-slate-400">
                                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            {/* Message Detail */}
            <div className="lg:col-span-2">
              <Card className="h-full min-h-[600px]">
                {selectedThread ? (
                  <>
                    <CardHeader className="border-b">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{selectedThread.subject}</CardTitle>
                          <CardDescription>
                            Started {format(new Date(selectedThread.created_at), 'PPP')}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={selectedThread.status === 'open' ? 'default' : 'secondary'}>
                            {selectedThread.status}
                          </Badge>
                          <Button
                            size="sm"
                            onClick={() => setShowReply(true)}
                            className="bg-emerald-600 hover:bg-emerald-700"
                          >
                            <Reply className="h-4 w-4 mr-2" />
                            Reply
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ScrollArea className="h-[450px] p-6">
                        <div className="space-y-6">
                          {selectedThread.messages?.map((message) => {
                            const isFromContractor = message.sender_role === 'contractor';
                            const isFromClient = message.sender_role === 'visitor' || message.sender_role === 'client';
                            const isFromAdmin = message.sender_role === 'admin' || message.sender_role === 'system';
                            
                            return (
                              <div
                                key={message.id}
                                className={cn(
                                  "p-4 rounded-lg border",
                                  isFromContractor && "bg-emerald-50 border-emerald-200 ml-8",
                                  isFromClient && "bg-blue-50 border-blue-200 mr-8",
                                  isFromAdmin && "bg-slate-100 border-slate-200 mr-8",
                                  !isFromContractor && !isFromClient && !isFromAdmin && "bg-slate-100 mr-8"
                                )}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className={cn(
                                      "h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-semibold",
                                      isFromContractor && "bg-emerald-600",
                                      isFromClient && "bg-blue-600",
                                      isFromAdmin && "bg-slate-600",
                                      !isFromContractor && !isFromClient && !isFromAdmin && "bg-slate-500"
                                    )}>
                                      {isFromContractor ? 'You' : (message.sender_name?.[0] || '?').toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-slate-900">
                                          {isFromContractor ? 'You' : (message.sender_name || message.sender_email)}
                                        </p>
                                        {isFromClient && (
                                          <Badge variant="outline" className="text-[10px] px-1 py-0 border-blue-300 text-blue-600">
                                            Client Reply
                                          </Badge>
                                        )}
                                        {isFromAdmin && (
                                          <Badge variant="outline" className="text-[10px] px-1 py-0 border-slate-400 text-slate-600">
                                            Admin
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-xs text-slate-500">
                                        {message.sender_email}
                                      </p>
                                    </div>
                                  </div>
                                  <span className="text-xs text-slate-400">
                                    {format(new Date(message.created_at), 'PPp')}
                                  </span>
                                </div>
                                <div 
                                  className="text-sm text-slate-700 prose prose-sm max-w-none"
                                  dangerouslySetInnerHTML={{ 
                                    __html: DOMPurify.sanitize(message.html_content || message.content.replace(/\n/g, '<br>')) 
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <Mail className="h-16 w-16 mx-auto text-slate-300 mb-4" />
                      <h3 className="text-lg font-medium text-slate-700">Select a message</h3>
                      <p className="text-slate-500 mt-1">Choose a conversation from the list</p>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </main>

        {/* Reply Dialog */}
        <Dialog open={showReply} onOpenChange={setShowReply}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Reply to: {selectedThread?.subject}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Your Message</Label>
                <Textarea
                  placeholder="Type your reply..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  rows={6}
                  className="mt-1"
                />
              </div>
              
              {/* Attachments */}
              <div>
                <Label>Attachments</Label>
                <div className="mt-2 space-y-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-slate-100 rounded">
                      {getFileIcon(file)}
                      <span className="text-sm flex-1 truncate">{file.name}</span>
                      <span className="text-xs text-slate-500">{formatFileSize(file.size)}</span>
                      <button onClick={() => removeAttachment(index)}>
                        <X className="h-4 w-4 text-slate-400 hover:text-red-500" />
                      </button>
                    </div>
                  ))}
                  <label className="flex items-center gap-2 p-3 border-2 border-dashed rounded-lg cursor-pointer hover:border-emerald-400">
                    <Paperclip className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-500">Add attachment (max 10MB)</span>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowReply(false)}>Cancel</Button>
              <Button 
                onClick={handleSendReply}
                disabled={sending || !replyContent.trim()}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {sending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Reply
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Compose Dialog */}
        <Dialog open={showCompose} onOpenChange={setShowCompose}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>New Message to Admin</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Subject</Label>
                <Input
                  placeholder="e.g., Question about invoice payment"
                  value={composeData.subject}
                  onChange={(e) => setComposeData(prev => ({ ...prev, subject: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Message</Label>
                <Textarea
                  placeholder="Type your message..."
                  value={composeData.body}
                  onChange={(e) => setComposeData(prev => ({ ...prev, body: e.target.value }))}
                  rows={6}
                  className="mt-1"
                />
              </div>
              
              {/* Attachments */}
              <div>
                <Label>Attachments</Label>
                <div className="mt-2 space-y-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-slate-100 rounded">
                      {getFileIcon(file)}
                      <span className="text-sm flex-1 truncate">{file.name}</span>
                      <span className="text-xs text-slate-500">{formatFileSize(file.size)}</span>
                      <button onClick={() => removeAttachment(index)}>
                        <X className="h-4 w-4 text-slate-400 hover:text-red-500" />
                      </button>
                    </div>
                  ))}
                  <label className="flex items-center gap-2 p-3 border-2 border-dashed rounded-lg cursor-pointer hover:border-emerald-400">
                    <Paperclip className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-500">Add attachment (max 10MB)</span>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCompose(false)}>Cancel</Button>
              <Button 
                onClick={handleSendNewMessage}
                disabled={sending || !composeData.subject.trim() || !composeData.body.trim()}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {sending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Professional Email Composer */}
        <ProfessionalEmailComposer
          open={showDirectEmail}
          onClose={() => setShowDirectEmail(false)}
          onSend={handleSendDirectEmail}
          senderName={portalUser?.legal_full_name || portalUser?.email || 'Contractor'}
          senderEmail={portalUser?.email || ''}
        />
      </div>
    </>
  );
}
