import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, FileText, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface UploadedDocument {
  name: string;
  url: string;
  type: string;
  size: number;
}

interface CertificationUploadProps {
  userId: string;
  businessId?: string;
  documents: UploadedDocument[];
  onDocumentsChange: (documents: UploadedDocument[]) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
}

export function CertificationUpload({
  userId,
  businessId,
  documents,
  onDocumentsChange,
  disabled = false,
  required = false,
  error,
}: CertificationUploadProps) {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const maxSize = 10 * 1024 * 1024; // 10MB limit

    if (file.size > maxSize) {
      toast.error("File size must be less than 10MB");
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a PDF or image file (JPEG, PNG, WebP)");
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from("verification-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Store the storage object path (private bucket) rather than a public URL.
      const newDoc: UploadedDocument = {
        name: file.name,
        url: fileName,
        type: file.type,
        size: file.size,
      };

      onDocumentsChange([...documents, newDoc]);
      toast.success("Document uploaded successfully");
    } catch (error: any) {
      console.error("Error uploading file:", error);
      toast.error(error.message || "Failed to upload document");
    } finally {
      setUploading(false);
      // Reset the input
      e.target.value = "";
    }
  };

  const removeDocument = (index: number) => {
    const updated = documents.filter((_, i) => i !== index);
    onDocumentsChange(updated);
  };

  return (
    <div className="space-y-3">
      <Label className={error ? "text-destructive" : ""}>
        Upload Certification Documents {required && <span className="text-destructive">*</span>}
      </Label>
      <p className="text-xs text-muted-foreground">
        Upload certificates, licenses, or credentials to verify your qualifications.
        You can upload multiple documents. Accepted formats: PDF, JPEG, PNG, WebP (max 10MB each)
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Uploaded documents list */}
      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((doc, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border"
            >
              <FileText className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-sm flex-1 truncate">{doc.name}</span>
              <Badge variant="secondary" className="text-xs">
                {(doc.size / 1024).toFixed(0)} KB
              </Badge>
              <CheckCircle className="w-4 h-4 text-green-500" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeDocument(index)}
                disabled={disabled}
                className="h-6 w-6 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      <div className="relative">
        <Input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          onChange={handleFileUpload}
          disabled={uploading || disabled}
          className="hidden"
          id="cert-upload"
        />
        <Button
          type="button"
          variant={error ? "destructive" : "outline"}
          size="sm"
          disabled={uploading || disabled}
          onClick={() => document.getElementById("cert-upload")?.click()}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              {documents.length > 0 ? "Upload Another Document" : "Upload Document"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
