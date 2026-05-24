import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, X, Loader2, Image as ImageIcon, Zap, AlertTriangle } from "lucide-react";
import { optimizeImage, blobToFile, getOptimalFormat } from "@/lib/imageOptimization";
import { validateBusinessImage, getQualitySummary } from "@/lib/imageQualityValidation";

export interface UploadedImage {
  name: string;
  url: string;
  type: string;
  size: number;
  originalSize?: number;
}

interface BusinessImageUploadProps {
  userId: string;
  images: UploadedImage[];
  onImagesChange: (images: UploadedImage[]) => void;
  disabled?: boolean;
  maxImages?: number;
  label?: string;
  description?: string;
  required?: boolean;
  error?: string;
}

export function BusinessImageUpload({
  userId,
  images,
  onImagesChange,
  disabled = false,
  maxImages = 10,
  label = "Business Images",
  description = "Upload photos of your work, projects, or business. High-quality images help attract customers.",
  required = false,
  error,
}: BusinessImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Check if adding more files would exceed the limit
    if (images.length + files.length > maxImages) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }

    setUploading(true);
    setValidationErrors([]);
    const newImages: UploadedImage[] = [];
    const allErrors: string[] = [];

    try {
      const optimalFormat = await getOptimalFormat();
      const totalFiles = files.length;

      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];
        
        // Validate file type - accept all common image formats
        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp", "image/tiff", "image/svg+xml", "image/heic", "image/heif", "image/avif"];
        if (!file.type.startsWith("image/")) {
          allErrors.push(`${file.name}: Only image files are allowed`);
          continue;
        }

        // Validate image quality
        setProgress(`Checking quality ${i + 1}/${totalFiles}...`);
        const qualityResult = await validateBusinessImage(file);
        
        if (!qualityResult.isValid) {
          qualityResult.errors.forEach(err => {
            allErrors.push(`${file.name}: ${err}`);
          });
          continue;
        }

        // Show warnings as toasts but continue with upload
        qualityResult.warnings.forEach(warning => {
          toast.warning(`${file.name}: ${warning}`, { duration: 5000 });
        });

        // Log quality summary
        console.log(`${file.name}: ${getQualitySummary(qualityResult)}`);
        toast.info(`${file.name}: ${getQualitySummary(qualityResult)}`, { duration: 3000 });

        setProgress(`Enhancing to HD ${i + 1}/${totalFiles}...`);
        setOptimizing(true);

        try {
          // Optimize and enhance the image to HD quality before upload
          const optimized = await optimizeImage(file, {
            maxWidth: 1920,
            maxHeight: 1080,
            minWidth: 1280,
            minHeight: 720,
            quality: 0.92,
            format: optimalFormat,
            enhanceToHD: true,
          });

          const optimizedFile = blobToFile(optimized.blob, file.name);
          
          setProgress(`Uploading HD ${i + 1}/${totalFiles}...`);
          setOptimizing(false);

          const fileExt = optimizedFile.name.split(".").pop()?.toLowerCase();
          const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("verification-documents")
            .upload(fileName, optimizedFile);

          if (uploadError) {
            console.error("Upload error:", uploadError);
            toast.error(`Failed to upload ${file.name}`);
            continue;
          }

          const { data: urlData } = supabase.storage
            .from("verification-documents")
            .getPublicUrl(fileName);

          newImages.push({
            name: file.name,
            url: urlData.publicUrl,
            type: optimizedFile.type,
            size: optimized.optimizedSize,
            originalSize: optimized.originalSize,
          });

          // Show HD enhancement info
          if (optimized.wasUpscaled) {
            console.log(`${file.name}: Enhanced to HD (${optimized.width}x${optimized.height})`);
          } else if (optimized.compressionRatio > 10) {
            console.log(`${file.name}: Optimized - ${optimized.compressionRatio}% smaller`);
          }
        } catch (optError) {
          console.error("Optimization error:", optError);
          // Fallback to original file if optimization fails
          setOptimizing(false);
          setProgress(`Uploading ${i + 1}/${totalFiles}...`);
          
          const fileExt = file.name.split(".").pop()?.toLowerCase();
          const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("verification-documents")
            .upload(fileName, file);

          if (uploadError) {
            console.error("Upload error:", uploadError);
            toast.error(`Failed to upload ${file.name}`);
            continue;
          }

          const { data: urlData } = supabase.storage
            .from("verification-documents")
            .getPublicUrl(fileName);

          newImages.push({
            name: file.name,
            url: urlData.publicUrl,
            type: file.type,
            size: file.size,
          });
        }
      }

      if (newImages.length > 0) {
        onImagesChange([...images, ...newImages]);
        
        // Calculate total savings
        const totalOriginal = newImages.reduce((sum, img) => sum + (img.originalSize || img.size), 0);
        const totalOptimized = newImages.reduce((sum, img) => sum + img.size, 0);
        const savingsPercent = Math.round((1 - totalOptimized / totalOriginal) * 100);
        
        if (savingsPercent > 10) {
          toast.success(
            `${newImages.length} HD image${newImages.length > 1 ? 's' : ''} uploaded • Optimized ${savingsPercent}%`,
            { icon: <Zap className="w-4 h-4 text-accent" /> }
          );
        } else {
          toast.success(
            `${newImages.length} HD image${newImages.length > 1 ? 's' : ''} uploaded`,
            { icon: <Zap className="w-4 h-4 text-accent" /> }
          );
        }
      }

      // Show validation errors for rejected images
      if (allErrors.length > 0) {
        setValidationErrors(allErrors);
        allErrors.forEach(err => {
          toast.error(err, { duration: 6000 });
        });
      }
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to upload images");
    } finally {
      setUploading(false);
      setOptimizing(false);
      setProgress("");
      // Reset file input
      event.target.value = "";
    }
  };

  const removeImage = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    onImagesChange(updated);
  };

  const clearValidationErrors = () => {
    setValidationErrors([]);
  };

  return (
    <div className="space-y-3">
      <Label className={error || validationErrors.length > 0 ? "text-destructive" : ""}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <p className="text-xs text-muted-foreground">
        {description}
      </p>
      <p className="text-xs text-muted-foreground">
        <strong>Requirements:</strong> Min 200×200px, max {maxImages} images, 15MB each. All image formats accepted.
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Validation errors display */}
      {validationErrors.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <p className="text-sm font-medium text-destructive">Some images were rejected:</p>
              <ul className="text-xs text-destructive/90 space-y-1 list-disc list-inside">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              onClick={clearValidationErrors}
              className="text-destructive/70 hover:text-destructive"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Uploaded images grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((img, index) => (
            <div
              key={index}
              className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-muted"
            >
              <img
                src={img.url}
                alt={img.name}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={disabled}
              >
                <X className="w-3 h-3" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                <p className="text-xs text-white truncate">{img.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {images.length < maxImages && (
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="file"
            id="image-upload"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            disabled={uploading || disabled}
            className="hidden"
          />
          <Button
            type="button"
            variant={error ? "destructive" : "outline"}
            size="sm"
            disabled={uploading || disabled}
            onClick={() => document.getElementById("image-upload")?.click()}
            className="gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {optimizing ? progress || "Optimizing..." : progress || "Uploading..."}
              </>
            ) : (
              <>
                <ImageIcon className="w-4 h-4" />
                {images.length > 0 ? "Add More Images" : "Upload Images"}
              </>
            )}
          </Button>
          <span className="text-xs text-muted-foreground">
            {images.length}/{maxImages} images
          </span>
          {!uploading && (
            <span className="text-xs text-accent flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Auto HD Enhanced
            </span>
          )}
        </div>
      )}
    </div>
  );
}
