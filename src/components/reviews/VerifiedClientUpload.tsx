import { useState } from "react";
import { Upload, FileText, X, Loader2, CheckCircle, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VerifiedClientUploadProps {
  reviewId: string;
  userId: string;
  existingProofUrl?: string | null;
  existingProofName?: string | null;
  isVerifiedClient: boolean;
  verificationRequestedAt?: string | null;
  onUploadComplete?: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

const VerifiedClientUpload = ({
  reviewId,
  userId,
  existingProofUrl,
  existingProofName,
  isVerifiedClient,
  verificationRequestedAt,
  onUploadComplete,
}: VerifiedClientUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Please upload a PDF or image file (JPEG, PNG, WebP)");
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setUploading(true);

    try {
      // Create unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/${reviewId}-${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("review-proofs")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("review-proofs")
        .getPublicUrl(fileName);

      // Update review with proof document
      const { error: updateError } = await supabase
        .from("reviews")
        .update({
          proof_document_url: fileName,
          proof_document_name: file.name,
          verification_requested_at: new Date().toISOString(),
        })
        .eq("id", reviewId);

      if (updateError) throw updateError;

      toast.success("Proof document uploaded! Pending admin verification.");
      onUploadComplete?.();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveProof = async () => {
    if (!existingProofUrl) return;

    setRemoving(true);
    try {
      // Remove from storage
      await supabase.storage.from("review-proofs").remove([existingProofUrl]);

      // Update review
      const { error } = await supabase
        .from("reviews")
        .update({
          proof_document_url: null,
          proof_document_name: null,
          verification_requested_at: null,
          is_verified_client: false,
        })
        .eq("id", reviewId);

      if (error) throw error;

      toast.success("Proof document removed");
      onUploadComplete?.();
    } catch (error: any) {
      console.error("Remove error:", error);
      toast.error("Failed to remove document");
    } finally {
      setRemoving(false);
    }
  };

  // Already verified
  if (isVerifiedClient) {
    return (
      <Card className="border-green-500/20 bg-green-500/5">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-green-700">Verified Client</p>
              <p className="text-xs text-muted-foreground">
                Your proof of project completion has been verified.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Proof uploaded, awaiting verification
  if (existingProofUrl && verificationRequestedAt) {
    return (
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-700">Verification Pending</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {existingProofName || "Document uploaded"}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemoveProof}
              disabled={removing}
            >
              {removing ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Upload form
  return (
    <Card className="border-dashed">
      <CardContent className="py-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Upload className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-sm">Get Verified Client Badge</p>
              <p className="text-xs text-muted-foreground">
                Upload proof of project completion (invoice, contract, or photo) to receive a verified badge on your review.
              </p>
            </div>
          </div>
          
          <div>
            <Label htmlFor={`proof-upload-${reviewId}`} className="sr-only">
              Upload proof document
            </Label>
            <Input
              id={`proof-upload-${reviewId}`}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={handleFileUpload}
              disabled={uploading}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground mt-1">
              PDF, JPEG, PNG, or WebP. Max 10MB.
            </p>
          </div>

          {uploading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default VerifiedClientUpload;
