import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, X, Loader2, AlertTriangle } from "lucide-react";
import { validateLogoImage, getQualitySummary } from "@/lib/imageQualityValidation";

export interface UploadedLogo {
  name: string;
  url: string;
  type: string;
  size: number;
}

interface LogoUploadProps {
  userId: string;
  logo: UploadedLogo | null;
  onLogoChange: (logo: UploadedLogo | null) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
}

export function LogoUpload({
  userId,
  logo,
  onLogoChange,
  disabled = false,
  required = false,
  error,
}: LogoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setValidationError(null);

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPEG, PNG, WebP, and SVG images are allowed for logos");
      return;
    }

    // SVG files skip dimension validation
    if (file.type !== "image/svg+xml") {
      // Validate logo quality
      const qualityResult = await validateLogoImage(file);
      
      if (!qualityResult.isValid) {
        const errorMessage = qualityResult.errors.join(" ");
        setValidationError(errorMessage);
        toast.error(errorMessage, { duration: 5000 });
        event.target.value = "";
        return;
      }

      // Show warnings but continue
      qualityResult.warnings.forEach(warning => {
        toast.warning(warning, { duration: 4000 });
      });

      console.log(`Logo: ${getQualitySummary(qualityResult)}`);
    }

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop()?.toLowerCase();
      const fileName = `${userId}/logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("verification-documents")
        .upload(fileName, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast.error("Failed to upload logo");
        return;
      }

      const { data: urlData } = supabase.storage
        .from("verification-documents")
        .getPublicUrl(fileName);

      onLogoChange({
        name: file.name,
        url: urlData.publicUrl,
        type: file.type,
        size: file.size,
      });
      toast.success("Logo uploaded successfully");
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to upload logo");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const removeLogo = () => {
    onLogoChange(null);
  };

  return (
    <div className="space-y-3">
      <Label className={error || validationError ? "text-destructive" : ""}>
        Business Logo (Optional)
      </Label>
      <p className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 px-2 py-1 rounded-md border border-amber-200 dark:border-amber-800">
        <strong>Optional.</strong> Many businesses choose to showcase their work photos instead.
      </p>
      <p className="text-xs text-muted-foreground">
        <strong>Requirements:</strong> Min 100×100px, max 2MB. Formats: JPEG, PNG, WebP, SVG
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}
      
      {/* Validation error display */}
      {validationError && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-destructive">{validationError}</p>
            </div>
            <button
              type="button"
              onClick={() => setValidationError(null)}
              className="text-destructive/70 hover:text-destructive"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Logo preview */}
      {logo && (
        <div className="relative inline-block">
          <div className="w-28 h-28 rounded-xl overflow-hidden border-2 border-border bg-background shadow-sm flex items-center justify-center">
            <img
              src={logo.url}
              alt={logo.name}
              className="max-w-full max-h-full object-contain p-3"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/placeholder.svg';
              }}
            />
          </div>
          <button
            type="button"
            onClick={removeLogo}
            className="absolute -top-2 -right-2 p-1.5 bg-destructive text-destructive-foreground rounded-full shadow-md hover:bg-destructive/90 transition-colors"
            disabled={disabled}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Upload button */}
      {!logo && (
        <div className="flex items-center gap-2">
          <input
            type="file"
            id="logo-upload"
            accept="image/jpeg,image/png,image/webp,image/svg+xml"
            onChange={handleFileUpload}
            disabled={uploading || disabled}
            className="hidden"
          />
          <Button
            type="button"
            variant={error ? "destructive" : "outline"}
            size="sm"
            disabled={uploading || disabled}
            onClick={() => document.getElementById("logo-upload")?.click()}
            className="gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload Logo
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
