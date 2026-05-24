import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Paperclip, Upload, X, File, Image, FileText, RefreshCw } from "lucide-react";

interface AttachmentUploadProps {
  threadId: string;
  messageId?: string;
  userId: string;
  onUploadComplete?: (attachments: UploadedAttachment[]) => void;
}

interface UploadedAttachment {
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
}

interface PendingFile {
  file: File;
  preview?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed'
];

export function AttachmentUpload({ 
  threadId, 
  messageId, 
  userId, 
  onUploadComplete 
}: AttachmentUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name} is too large (max 10MB)`;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `${file.name} has an unsupported file type`;
    }
    return null;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: PendingFile[] = [];
    
    for (const file of files) {
      const error = validateFile(file);
      if (error) {
        toast.error(error);
      } else {
        const pending: PendingFile = { file };
        if (file.type.startsWith('image/')) {
          pending.preview = URL.createObjectURL(file);
        }
        validFiles.push(pending);
      }
    }
    
    setPendingFiles(prev => [...prev, ...validFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setPendingFiles(prev => {
      const updated = [...prev];
      if (updated[index].preview) {
        URL.revokeObjectURL(updated[index].preview!);
      }
      updated.splice(index, 1);
      return updated;
    });
  };

  const uploadFiles = async (): Promise<UploadedAttachment[]> => {
    if (pendingFiles.length === 0) return [];
    
    setUploading(true);
    const uploaded: UploadedAttachment[] = [];
    
    try {
      for (const { file } of pendingFiles) {
        const timestamp = Date.now();
        const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `${userId}/${threadId}/${timestamp}_${safeFileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('communication-attachments')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });
        
        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }
        
        uploaded.push({
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size
        });
      }
      
      // Clean up previews
      pendingFiles.forEach(f => {
        if (f.preview) URL.revokeObjectURL(f.preview);
      });
      setPendingFiles([]);
      
      if (onUploadComplete) {
        onUploadComplete(uploaded);
      }
      
      return uploaded;
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files');
      return [];
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image;
    if (type.includes('pdf')) return FileText;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        multiple
        accept={ALLOWED_TYPES.join(',')}
      />
      
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Paperclip className="h-4 w-4 mr-2" />
          Attach Files
        </Button>
        
        {pendingFiles.length > 0 && (
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={uploadFiles}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload {pendingFiles.length} file{pendingFiles.length > 1 ? 's' : ''}
              </>
            )}
          </Button>
        )}
      </div>
      
      {pendingFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pendingFiles.map((pending, index) => {
            const FileIcon = getFileIcon(pending.file.type);
            return (
              <div
                key={index}
                className="relative flex items-center gap-2 bg-muted/50 border rounded-lg p-2 pr-8"
              >
                {pending.preview ? (
                  <img
                    src={pending.preview}
                    alt={pending.file.name}
                    className="h-10 w-10 object-cover rounded"
                  />
                ) : (
                  <div className="h-10 w-10 flex items-center justify-center bg-muted rounded">
                    <FileIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate max-w-[150px]">
                    {pending.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(pending.file.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="absolute top-1 right-1 p-1 rounded-full hover:bg-muted transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
      
      <p className="text-xs text-muted-foreground">
        Supported: Images, PDF, Word, Excel, Text, ZIP (max 10MB each)
      </p>
    </div>
  );
}

export default AttachmentUpload;