import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Mail,
  Send,
  X,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Video,
  File,
  Link as LinkIcon,
  Plus,
  RefreshCw,
  Upload,
  CheckCircle,
  AlertCircle,
  Trash2,
  Eye,
  Clock,
  Building2,
  User,
  FileImage,
  FileVideo,
  FileArchive
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface Attachment {
  id: string;
  file?: File;
  name: string;
  size: number;
  type: string;
  category: 'document' | 'image' | 'video' | 'link' | 'other';
  url?: string;
  uploadProgress?: number;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
}

interface LinkAttachment {
  id: string;
  title: string;
  url: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

interface ProfessionalEmailComposerProps {
  open: boolean;
  onClose: () => void;
  onSend: (data: EmailData) => Promise<void>;
  senderName: string;
  senderEmail: string;
  defaultRecipient?: string;
  defaultRecipientName?: string;
}

export interface EmailData {
  to: string;
  toName: string;
  subject: string;
  body: string;
  attachments: { name: string; url: string; type: string; size: number }[];
  links: { title: string; url: string }[];
}

const ALLOWED_FILE_TYPES = {
  documents: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf', '.csv'],
  images: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'],
  videos: ['.mp4', '.webm', '.mov', '.avi', '.mkv'],
  archives: ['.zip', '.rar', '.7z'],
};

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB total

const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'quote',
    name: 'Quote Follow-up',
    subject: 'Following up on your quote request',
    body: `Dear [Client Name],

I hope this email finds you well. I wanted to follow up on the quote I provided for your project.

I'm available to discuss any questions you may have about the scope of work, timeline, or pricing.

Looking forward to the opportunity to work with you.

Best regards`
  },
  {
    id: 'update',
    name: 'Project Update',
    subject: 'Project Update - [Project Name]',
    body: `Dear [Client Name],

I wanted to provide you with an update on the progress of your project.

Current Status:
• Phase 1: Completed
• Phase 2: In Progress
• Phase 3: Scheduled for [Date]

We are on track to complete the project by [Completion Date].

Please let me know if you have any questions.

Best regards`
  },
  {
    id: 'invoice',
    name: 'Invoice Reminder',
    subject: 'Invoice Reminder - [Invoice Number]',
    body: `Dear [Client Name],

I wanted to kindly remind you that invoice [Invoice Number] dated [Date] for $[Amount] is now due.

If you have already made the payment, please disregard this message.

Thank you for your prompt attention to this matter.

Best regards`
  },
  {
    id: 'completion',
    name: 'Project Completion',
    subject: 'Project Completed - Thank You',
    body: `Dear [Client Name],

I'm pleased to inform you that your project has been successfully completed.

Please review the completed work at your convenience. If you have any questions or require any adjustments, please don't hesitate to contact me.

I would greatly appreciate it if you could leave a review of your experience.

Thank you for choosing Wellington EcoBuild.

Best regards`
  }
];

const getFileCategory = (file: File): Attachment['category'] => {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (ALLOWED_FILE_TYPES.documents.includes(ext)) return 'document';
  if (ALLOWED_FILE_TYPES.images.includes(ext)) return 'image';
  if (ALLOWED_FILE_TYPES.videos.includes(ext)) return 'video';
  return 'other';
};

const getFileIcon = (category: Attachment['category'], className = "h-5 w-5") => {
  switch (category) {
    case 'document': return <FileText className={cn(className, "text-blue-500")} />;
    case 'image': return <FileImage className={cn(className, "text-emerald-500")} />;
    case 'video': return <FileVideo className={cn(className, "text-purple-500")} />;
    default: return <File className={cn(className, "text-slate-500")} />;
  }
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

export function ProfessionalEmailComposer({
  open,
  onClose,
  onSend,
  senderName,
  senderEmail,
  defaultRecipient = '',
  defaultRecipientName = ''
}: ProfessionalEmailComposerProps) {
  const [to, setTo] = useState(defaultRecipient);
  const [toName, setToName] = useState(defaultRecipientName);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [links, setLinks] = useState<LinkAttachment[]>([]);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [newLink, setNewLink] = useState({ title: '', url: '' });
  const [activeTab, setActiveTab] = useState('compose');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  const totalSize = attachments.reduce((acc, a) => acc + a.size, 0);

  const handleFileSelect = async (files: FileList | null, category?: string) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const newAttachments: Attachment[] = [];

    for (const file of fileArray) {
      // Check individual file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds 25MB limit`);
        continue;
      }

      // Check total size
      const currentTotal = totalSize + newAttachments.reduce((acc, a) => acc + a.size, 0);
      if (currentTotal + file.size > MAX_TOTAL_SIZE) {
        toast.error('Total attachment size would exceed 50MB limit');
        break;
      }

      newAttachments.push({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        category: getFileCategory(file),
        status: 'pending'
      });
    }

    if (newAttachments.length > 0) {
      setAttachments(prev => [...prev, ...newAttachments]);
      await uploadFiles(newAttachments);
    }
  };

  const uploadFiles = async (filesToUpload: Attachment[]) => {
    setUploading(true);

    for (const attachment of filesToUpload) {
      if (!attachment.file) continue;

      try {
        setAttachments(prev => 
          prev.map(a => a.id === attachment.id ? { ...a, status: 'uploading' } : a)
        );

        const fileName = `portal-attachments/${Date.now()}-${attachment.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const { data, error } = await supabase.storage
          .from('avatars')
          .upload(fileName, attachment.file);

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        setAttachments(prev => 
          prev.map(a => a.id === attachment.id 
            ? { ...a, status: 'uploaded', url: urlData.publicUrl } 
            : a
          )
        );
      } catch (error) {
        console.error('Upload error:', error);
        setAttachments(prev => 
          prev.map(a => a.id === attachment.id ? { ...a, status: 'error' } : a)
        );
        toast.error(`Failed to upload ${attachment.name}`);
      }
    }

    setUploading(false);
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const addLink = () => {
    if (!newLink.url.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(newLink.url.startsWith('http') ? newLink.url : `https://${newLink.url}`);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    const url = newLink.url.startsWith('http') ? newLink.url : `https://${newLink.url}`;
    
    setLinks(prev => [...prev, {
      id: `link-${Date.now()}`,
      title: newLink.title || url,
      url
    }]);
    setNewLink({ title: '', url: '' });
    setShowLinkDialog(false);
  };

  const removeLink = (id: string) => {
    setLinks(prev => prev.filter(l => l.id !== id));
  };

  const applyTemplate = (template: EmailTemplate) => {
    setSubject(template.subject);
    setBody(template.body);
    setActiveTab('compose');
    toast.success(`"${template.name}" template applied`);
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSend = async () => {
    if (!to.trim()) {
      toast.error('Please enter recipient email');
      return;
    }
    if (!validateEmail(to)) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (!subject.trim()) {
      toast.error('Please enter a subject');
      return;
    }
    if (!body.trim()) {
      toast.error('Please enter a message');
      return;
    }

    // Check if any uploads are still in progress
    if (attachments.some(a => a.status === 'uploading')) {
      toast.error('Please wait for uploads to complete');
      return;
    }

    // Check for failed uploads
    const failedUploads = attachments.filter(a => a.status === 'error');
    if (failedUploads.length > 0) {
      toast.error('Please remove failed uploads before sending');
      return;
    }

    setSending(true);
    try {
      await onSend({
        to,
        toName,
        subject,
        body,
        attachments: attachments
          .filter(a => a.status === 'uploaded' && a.url)
          .map(a => ({ name: a.name, url: a.url!, type: a.type, size: a.size })),
        links
      });
      
      // Reset form
      setTo(defaultRecipient);
      setToName(defaultRecipientName);
      setSubject('');
      setBody('');
      setAttachments([]);
      setLinks([]);
      onClose();
    } catch (error) {
      console.error('Send error:', error);
    } finally {
      setSending(false);
    }
  };

  const attachmentsByCategory = {
    documents: attachments.filter(a => a.category === 'document'),
    images: attachments.filter(a => a.category === 'image'),
    videos: attachments.filter(a => a.category === 'video'),
    other: attachments.filter(a => a.category === 'other')
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] w-[95vw] sm:w-full flex flex-col p-0 gap-0 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-700 to-emerald-800 px-4 sm:px-6 py-4 rounded-t-lg flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                <Mail className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-white truncate">Compose Email</h2>
                <p className="text-emerald-100 text-sm truncate">Wellington EcoBuild • Professional Communication</p>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="px-6 border-b bg-slate-50 flex-shrink-0">
              <TabsList className="h-12 bg-transparent gap-1 p-0">
                <TabsTrigger value="compose" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-b-none">
                  <Mail className="h-4 w-4 mr-2" />
                  Compose
                </TabsTrigger>
                <TabsTrigger value="attachments" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-b-none">
                  <Paperclip className="h-4 w-4 mr-2" />
                  Attachments
                  {attachments.length > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 px-1.5 bg-emerald-100 text-emerald-700">
                      {attachments.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="templates" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-b-none">
                  <FileText className="h-4 w-4 mr-2" />
                  Templates
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              <TabsContent value="compose" className="m-0 p-4 sm:p-6 space-y-4 h-full">
                {/* Sender Info */}
                <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                  <div className="h-10 w-10 rounded-full bg-emerald-200 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-5 w-5 text-emerald-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-emerald-900 truncate">{senderName}</p>
                    <p className="text-xs text-emerald-600">via Wellington EcoBuild • Replies CC'd to your email</p>
                  </div>
                </div>

                {/* Recipient */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="min-w-0">
                    <Label className="text-sm font-medium text-slate-700">Recipient Email *</Label>
                    <Input
                      type="email"
                      placeholder="client@example.com"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      className="mt-1.5 w-full truncate"
                    />
                  </div>
                  <div className="min-w-0">
                    <Label className="text-sm font-medium text-slate-700">Recipient Name</Label>
                    <Input
                      placeholder="John Smith (optional)"
                      value={toName}
                      onChange={(e) => setToName(e.target.value)}
                      className="mt-1.5 w-full truncate"
                    />
                  </div>
                </div>

                {/* Subject */}
                <div className="min-w-0">
                  <Label className="text-sm font-medium text-slate-700">Subject *</Label>
                  <Input
                    placeholder="Enter email subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="mt-1.5 w-full"
                  />
                </div>

                {/* Message */}
                <div className="min-w-0 flex-1">
                  <Label className="text-sm font-medium text-slate-700">Message *</Label>
                  <Textarea
                    placeholder="Type your message here..."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={8}
                    className="mt-1.5 resize-none font-sans w-full min-h-[180px] max-h-[300px]"
                  />
                </div>

                {/* Quick Attachments Bar */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                  <span className="text-xs font-medium text-slate-500">Quick Add:</span>
                  <input ref={documentInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.csv" multiple onChange={(e) => handleFileSelect(e.target.files, 'document')} />
                  <input ref={imageInputRef} type="file" className="hidden" accept="image/*" multiple onChange={(e) => handleFileSelect(e.target.files, 'image')} />
                  <input ref={videoInputRef} type="file" className="hidden" accept="video/*" multiple onChange={(e) => handleFileSelect(e.target.files, 'video')} />
                  
                  <Button variant="outline" size="sm" onClick={() => documentInputRef.current?.click()} className="h-8 text-xs gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    Document
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => imageInputRef.current?.click()} className="h-8 text-xs gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5" />
                    Photo
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => videoInputRef.current?.click()} className="h-8 text-xs gap-1.5">
                    <Video className="h-3.5 w-3.5" />
                    Video
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowLinkDialog(true)} className="h-8 text-xs gap-1.5">
                    <LinkIcon className="h-3.5 w-3.5" />
                    Link
                  </Button>
                </div>

                {/* Attachment Summary */}
                {(attachments.length > 0 || links.length > 0) && (
                  <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-600">
                        {attachments.length} file{attachments.length !== 1 ? 's' : ''} • {links.length} link{links.length !== 1 ? 's' : ''}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatFileSize(totalSize)} / 50MB
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {attachments.slice(0, 3).map(a => (
                        <Badge key={a.id} variant="secondary" className="gap-1 text-xs">
                          {getFileIcon(a.category, "h-3 w-3")}
                          {a.name.length > 15 ? a.name.slice(0, 12) + '...' : a.name}
                          {a.status === 'uploading' && <RefreshCw className="h-3 w-3 animate-spin" />}
                        </Badge>
                      ))}
                      {attachments.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{attachments.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="attachments" className="m-0 p-6 space-y-6">
                {/* Upload Zone */}
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    multiple
                    onChange={(e) => handleFileSelect(e.target.files)}
                  />
                  <Upload className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-700">Drop files here or click to browse</p>
                  <p className="text-xs text-slate-500 mt-1">
                    PDF, Word, Excel, Images, Videos up to 25MB each • 50MB total
                  </p>
                  <Button variant="outline" className="mt-4" onClick={() => fileInputRef.current?.click()}>
                    Select Files
                  </Button>
                </div>

                {/* File Type Buttons */}
                <div className="grid grid-cols-4 gap-3">
                  <button
                    onClick={() => documentInputRef.current?.click()}
                    className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed hover:border-blue-400 hover:bg-blue-50 transition-colors group"
                  >
                    <FileText className="h-8 w-8 text-blue-500" />
                    <span className="text-xs font-medium text-slate-600 group-hover:text-blue-600">Documents</span>
                    <span className="text-xs text-slate-400">PDF, Word, Excel</span>
                  </button>
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed hover:border-emerald-400 hover:bg-emerald-50 transition-colors group"
                  >
                    <ImageIcon className="h-8 w-8 text-emerald-500" />
                    <span className="text-xs font-medium text-slate-600 group-hover:text-emerald-600">Photos</span>
                    <span className="text-xs text-slate-400">JPG, PNG, GIF</span>
                  </button>
                  <button
                    onClick={() => videoInputRef.current?.click()}
                    className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed hover:border-purple-400 hover:bg-purple-50 transition-colors group"
                  >
                    <Video className="h-8 w-8 text-purple-500" />
                    <span className="text-xs font-medium text-slate-600 group-hover:text-purple-600">Videos</span>
                    <span className="text-xs text-slate-400">MP4, MOV, WebM</span>
                  </button>
                  <button
                    onClick={() => setShowLinkDialog(true)}
                    className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed hover:border-amber-400 hover:bg-amber-50 transition-colors group"
                  >
                    <LinkIcon className="h-8 w-8 text-amber-500" />
                    <span className="text-xs font-medium text-slate-600 group-hover:text-amber-600">Links</span>
                    <span className="text-xs text-slate-400">URLs & Resources</span>
                  </button>
                </div>

                {/* Attached Files List */}
                {attachments.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-800">Attached Files ({attachments.length})</h3>
                      <span className="text-xs text-slate-500">{formatFileSize(totalSize)} total</span>
                    </div>
                    <div className="space-y-2">
                      {attachments.map(attachment => (
                        <div
                          key={attachment.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                            attachment.status === 'error' ? 'bg-red-50 border-red-200' :
                            attachment.status === 'uploaded' ? 'bg-emerald-50 border-emerald-200' :
                            'bg-slate-50 border-slate-200'
                          )}
                        >
                          <div className="h-10 w-10 rounded-lg bg-white border flex items-center justify-center">
                            {getFileIcon(attachment.category)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{attachment.name}</p>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <span>{formatFileSize(attachment.size)}</span>
                              <span>•</span>
                              <span className="capitalize">{attachment.category}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {attachment.status === 'uploading' && (
                              <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
                            )}
                            {attachment.status === 'uploaded' && (
                              <CheckCircle className="h-4 w-4 text-emerald-500" />
                            )}
                            {attachment.status === 'error' && (
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-red-500"
                              onClick={() => removeAttachment(attachment.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Links List */}
                {links.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-800">Included Links ({links.length})</h3>
                    <div className="space-y-2">
                      {links.map(link => (
                        <div
                          key={link.id}
                          className="flex items-center gap-3 p-3 rounded-lg border bg-amber-50 border-amber-200"
                        >
                          <div className="h-10 w-10 rounded-lg bg-white border flex items-center justify-center">
                            <LinkIcon className="h-5 w-5 text-amber-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{link.title}</p>
                            <p className="text-xs text-slate-500 truncate">{link.url}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-blue-500"
                              onClick={() => window.open(link.url, '_blank')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-red-500"
                              onClick={() => removeLink(link.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {attachments.length === 0 && links.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <Paperclip className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No attachments yet</p>
                    <p className="text-xs text-slate-400">Add documents, images, videos, or links</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="templates" className="m-0 p-6">
                <div className="grid gap-3">
                  {EMAIL_TEMPLATES.map(template => (
                    <button
                      key={template.id}
                      onClick={() => applyTemplate(template)}
                      className="flex items-start gap-4 p-4 rounded-lg border hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors text-left group"
                    >
                      <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200">
                        <FileText className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-900">{template.name}</h4>
                        <p className="text-sm text-slate-500 mt-0.5">{template.subject}</p>
                        <p className="text-xs text-slate-400 mt-2 line-clamp-2">{template.body.slice(0, 100)}...</p>
                      </div>
                    </button>
                  ))}
                </div>
              </TabsContent>
            </div>
          </Tabs>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-slate-50 flex items-center justify-between gap-4">
            <div className="text-xs text-slate-500">
              <Clock className="h-3.5 w-3.5 inline mr-1" />
              Email will be sent with Wellington EcoBuild branding
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={sending || uploading || !to.trim() || !subject.trim() || !body.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 gap-2"
              >
                {sending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Email
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-amber-500" />
              Add Link
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Link Title (optional)</Label>
              <Input
                placeholder="e.g., Project Documentation"
                value={newLink.title}
                onChange={(e) => setNewLink(prev => ({ ...prev, title: e.target.value }))}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>URL *</Label>
              <Input
                placeholder="https://example.com/document"
                value={newLink.url}
                onChange={(e) => setNewLink(prev => ({ ...prev, url: e.target.value }))}
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkDialog(false)}>Cancel</Button>
            <Button onClick={addLink} className="bg-emerald-600 hover:bg-emerald-700">Add Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
