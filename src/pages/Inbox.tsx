import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  MessageSquare,
  Mail,
  Bell,
  FileText,
  Send,
  Paperclip,
  Clock,
  CheckCircle,
  ChevronRight,
  Upload,
  Download,
  X,
  RefreshCw,
  Inbox as InboxIcon,
  ArrowLeft,
  Plus
} from "lucide-react";

interface Thread {
  id: string;
  subject: string;
  channel_type: string;
  status: string;
  priority: string;
  category: string | null;
  initiator_name: string | null;
  initiator_role: string;
  created_at: string;
  last_message_at: string;
}

interface Message {
  id: string;
  thread_id: string;
  sender_id: string | null;
  sender_email: string | null;
  sender_name: string | null;
  sender_role: string;
  content: string;
  is_system_message: boolean;
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
  created_at: string;
}

const statusLabels: Record<string, string> = {
  unread: "New",
  read: "Read",
  replied: "Replied",
  resolved: "Resolved",
  under_review: "Under Review",
  archived: "Archived"
};

const channelIcons: Record<string, any> = {
  internal: MessageSquare,
  email: Mail,
  contact_form: FileText,
  system_notification: Bell,
  document_exchange: Paperclip
};

export default function Inbox() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composeFileInputRef = useRef<HTMLInputElement>(null);
  
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [attachments, setAttachments] = useState<Record<string, Attachment[]>>({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [replyContent, setReplyContent] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  
  // Compose new message state
  const [showCompose, setShowCompose] = useState(false);
  const [composeSubject, setComposeSubject] = useState("");
  const [composeMessage, setComposeMessage] = useState("");
  const [composeFiles, setComposeFiles] = useState<File[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchThreads();
    }
  }, [user]);

  const fetchThreads = async () => {
    setLoading(true);
    try {
      // Get threads where user is initiator or participant
      const { data: initiatorThreads, error: initError } = await supabase
        .from('communication_threads')
        .select('*')
        .eq('initiator_id', user?.id)
        .order('last_message_at', { ascending: false });

      if (initError) throw initError;

      const { data: participantData, error: partError } = await supabase
        .from('communication_participants')
        .select('thread_id')
        .or(`user_id.eq.${user?.id},user_email.eq.${user?.email?.toLowerCase()}`);

      if (partError) throw partError;

      const participantThreadIds = (participantData || []).map(p => p.thread_id);
      
      let participantThreads: Thread[] = [];
      if (participantThreadIds.length > 0) {
        const { data, error } = await supabase
          .from('communication_threads')
          .select('*')
          .in('id', participantThreadIds)
          .order('last_message_at', { ascending: false });
        
        if (error) throw error;
        participantThreads = (data || []) as Thread[];
      }

      // Merge and dedupe
      const allThreads = [...(initiatorThreads || []), ...participantThreads];
      const uniqueThreads = allThreads.reduce((acc: Thread[], current) => {
        if (!acc.find(t => t.id === current.id)) {
          acc.push(current as Thread);
        }
        return acc;
      }, []);

      // Sort by last_message_at
      uniqueThreads.sort((a, b) => 
        new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      );

      setThreads(uniqueThreads);
    } catch (error) {
      console.error('Error fetching threads:', error);
      toast.error('Failed to load messages');
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
      setMessages((data || []) as Message[]);
      
      // Fetch attachments
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

  const selectThread = async (thread: Thread) => {
    setSelectedThread(thread);
    await fetchMessages(thread.id);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPendingFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (messageId: string) => {
    if (pendingFiles.length === 0) return;
    
    setUploading(true);
    try {
      for (const file of pendingFiles) {
        const filePath = `${user?.id}/${selectedThread?.id}/${Date.now()}_${file.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from('communication-attachments')
          .upload(filePath, file);
        
        if (uploadError) throw uploadError;
        
        // Record attachment in database
        await supabase
          .from('communication_attachments')
          .insert({
            message_id: messageId,
            file_name: file.name,
            file_path: filePath,
            file_type: file.type,
            file_size: file.size,
            status: 'pending'
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

  const sendReply = async () => {
    if (!selectedThread || (!replyContent.trim() && pendingFiles.length === 0)) return;
    
    setSending(true);
    try {
      const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
      
      // Create message
      const { data: msgData, error } = await supabase
        .from('communication_messages')
        .insert({
          thread_id: selectedThread.id,
          sender_id: user?.id,
          sender_email: user?.email,
          sender_name: userName,
          sender_role: 'user',
          content: replyContent || 'Attachment'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Upload any pending files
      if (pendingFiles.length > 0 && msgData) {
        await uploadFiles(msgData.id);
      }
      
      // Update thread
      await supabase
        .from('communication_threads')
        .update({ 
          status: 'unread',
          last_message_at: new Date().toISOString()
        })
        .eq('id', selectedThread.id);
      
      // Send email notification to admin about user reply
      try {
        await supabase.functions.invoke('notify-admin', {
          body: {
            type: 'user_message_reply',
            title: 'User Reply',
            message: `${userName} replied to: "${selectedThread.subject}"`,
            metadata: {
              thread_id: selectedThread.id,
              message_id: msgData.id,
              user_email: user?.email,
              user_name: userName,
              subject: selectedThread.subject,
              preview: replyContent.substring(0, 100)
            }
          }
        });
      } catch (notifyError) {
        console.log('Admin notification failed (non-blocking):', notifyError);
      }
      
      setReplyContent("");
      await fetchMessages(selectedThread.id);
      toast.success('Message sent');
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const createNewThread = async () => {
    if (!composeSubject.trim() || !composeMessage.trim()) {
      toast.error('Please fill in subject and message');
      return;
    }
    
    setSending(true);
    try {
      const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
      
      // Create thread
      const { data: threadData, error: threadError } = await supabase
        .from('communication_threads')
        .insert({
          subject: composeSubject,
          channel_type: 'internal',
          status: 'unread',
          priority: 'normal',
          initiator_id: user?.id,
          initiator_email: user?.email,
          initiator_name: userName,
          initiator_role: 'user',
          category: 'support'
        })
        .select()
        .single();
      
      if (threadError) throw threadError;
      
      // Create initial message
      const { data: msgData, error: msgError } = await supabase
        .from('communication_messages')
        .insert({
          thread_id: threadData.id,
          sender_id: user?.id,
          sender_email: user?.email,
          sender_name: userName,
          sender_role: 'user',
          content: composeMessage
        })
        .select()
        .single();
      
      if (msgError) throw msgError;
      
      // Upload attachments if any
      if (composeFiles.length > 0 && msgData) {
        for (const file of composeFiles) {
          const filePath = `${user?.id}/${threadData.id}/${Date.now()}_${file.name}`;
          
          const { error: uploadError } = await supabase.storage
            .from('communication-attachments')
            .upload(filePath, file);
          
          if (!uploadError) {
            await supabase
              .from('communication_attachments')
              .insert({
                message_id: msgData.id,
                file_name: file.name,
                file_path: filePath,
                file_type: file.type,
                file_size: file.size,
                status: 'pending'
              });
          }
        }
      }
      
      // Send notification to admin about new user message
      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            type: 'user_message',
            recipient_email: 'info@wellingtonecobuild.nz',
            recipient_name: 'Admin',
            recipient_type: 'admin',
            sender_name: userName,
            sender_email: user?.email,
            subject: composeSubject,
            message_preview: composeMessage.substring(0, 200),
            thread_id: threadData.id,
            metadata: {
              message_id: msgData?.id,
              user_email: user?.email
            }
          }
        });
      } catch (notifyError) {
        console.log('Notification failed (non-blocking):', notifyError);
      }
      
      setShowCompose(false);
      setComposeSubject("");
      setComposeMessage("");
      setComposeFiles([]);
      toast.success('Message sent to support');
      fetchThreads();
    } catch (error) {
      console.error('Error creating thread:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleComposeFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setComposeFiles(prev => [...prev, ...files]);
    if (composeFileInputRef.current) composeFileInputRef.current.value = '';
  };

  const removeComposeFile = (index: number) => {
    setComposeFiles(prev => prev.filter((_, i) => i !== index));
  };

  const downloadAttachment = async (attachment: Attachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('communication-attachments')
        .download(attachment.file_path);
      
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading:', error);
      toast.error('Failed to download file');
    }
  };

  const getChannelIcon = (type: string) => {
    const Icon = channelIcons[type] || MessageSquare;
    return <Icon className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto py-20 flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <InboxIcon className="h-6 w-6" />
              My Messages
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Communicate with Wellington EcoBuild and receive replies from contractors
            </p>
          </div>
          <Button onClick={() => setShowCompose(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Message
          </Button>
        </div>

        {/* Info Banner */}
        <Card className="mb-6 bg-gradient-to-r from-primary/5 to-blue-50 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">Two-Way Communication</p>
                <p className="text-xs text-muted-foreground mt-1">
                  When contractors or Wellington EcoBuild reply to your enquiries, their responses appear here.
                  You can continue the conversation directly through this inbox.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Thread List */}
          <Card className="lg:col-span-1">
            <CardHeader className="py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Conversations</CardTitle>
                <Button variant="ghost" size="sm" onClick={fetchThreads}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <Separator />
            <ScrollArea className="h-[600px]">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : threads.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <InboxIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-4">No messages yet</p>
                  <Button onClick={() => setShowCompose(true)} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Send Your First Message
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {threads.map((thread) => (
                    <button
                      key={thread.id}
                      onClick={() => selectThread(thread)}
                      className={`w-full text-left p-4 hover:bg-muted/50 transition-colors ${
                        selectedThread?.id === thread.id ? 'bg-muted' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                          {getChannelIcon(thread.channel_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm truncate">
                              {thread.subject}
                            </span>
                            {thread.status === 'unread' && (
                              <span className="w-2 h-2 rounded-full bg-blue-500" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {format(new Date(thread.last_message_at), 'MMM d, h:mm a')}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Card>

          {/* Message View */}
          <Card className="lg:col-span-2">
            {selectedThread ? (
              <>
                <CardHeader className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="lg:hidden"
                        onClick={() => setSelectedThread(null)}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      <div>
                        <CardTitle className="text-base">{selectedThread.subject}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {statusLabels[selectedThread.status] || selectedThread.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Started {format(new Date(selectedThread.created_at), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <Separator />
                <ScrollArea className="h-[400px] p-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender_role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-4 ${
                            message.sender_role === 'admin'
                              ? 'bg-primary/10 border border-primary/20'
                              : message.is_system_message
                              ? 'bg-muted border'
                              : 'bg-muted'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            {message.is_system_message ? (
                              <Bell className="h-4 w-4 text-muted-foreground" />
                            ) : message.sender_role === 'admin' ? (
                              <CheckCircle className="h-4 w-4 text-primary" />
                            ) : null}
                            <span className="font-medium text-sm">
                              {message.sender_name || 'Unknown'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(message.created_at), 'MMM d, h:mm a')}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          
                          {/* Attachments */}
                          {attachments[message.id]?.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {attachments[message.id].map((att) => (
                                <button
                                  key={att.id}
                                  onClick={() => downloadAttachment(att)}
                                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                                >
                                  <Paperclip className="h-4 w-4" />
                                  <span>{att.file_name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    ({formatFileSize(att.file_size)})
                                  </span>
                                  <Download className="h-3 w-3" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <Separator />
                <CardContent className="p-4">
                  {/* Pending files */}
                  {pendingFiles.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {pendingFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg text-sm"
                        >
                          <Paperclip className="h-4 w-4" />
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
                  
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Type your reply..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      className="min-h-[80px]"
                    />
                    <div className="flex items-center justify-between">
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
                          <Paperclip className="h-4 w-4 mr-2" />
                          Attach Files
                        </Button>
                      </div>
                      <Button
                        onClick={sendReply}
                        disabled={sending || (!replyContent.trim() && pendingFiles.length === 0)}
                      >
                        {sending ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        Send Message
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </>
            ) : (
              <div className="flex items-center justify-center h-[600px] text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3" />
                  <p>Select a conversation to view messages</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </main>
      <Footer />

      {/* Compose Dialog */}
      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Contact Support</DialogTitle>
            <DialogDescription>
              Send a message to Wellington EcoBuild support team
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Input
              placeholder="Subject"
              value={composeSubject}
              onChange={(e) => setComposeSubject(e.target.value)}
            />
            
            <Textarea
              placeholder="Describe your issue or question..."
              value={composeMessage}
              onChange={(e) => setComposeMessage(e.target.value)}
              className="min-h-[150px]"
            />
            
            {/* File attachments */}
            <div>
              <input
                type="file"
                ref={composeFileInputRef}
                onChange={handleComposeFileSelect}
                className="hidden"
                multiple
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => composeFileInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4 mr-2" />
                Attach Files
              </Button>
              
              {composeFiles.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {composeFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg text-sm"
                    >
                      <Paperclip className="h-4 w-4" />
                      <span className="truncate max-w-[150px]">{file.name}</span>
                      <button
                        onClick={() => removeComposeFile(index)}
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
            <Button onClick={createNewThread} disabled={sending}>
              {sending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}