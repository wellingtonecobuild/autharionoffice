import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Link2, Loader2, X, Image } from "lucide-react";
import { toast } from "sonner";

interface ArticleImageUploadProps {
  value: string;
  onChange: (url: string) => void;
}

export const ArticleImageUpload = ({ value, onChange }: ArticleImageUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `article-${Date.now()}.${fileExt}`;
      const filePath = `articles/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("business-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("business-images")
        .getPublicUrl(filePath);

      onChange(publicUrl);
      toast.success("Image uploaded successfully");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload image");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = () => {
    onChange("");
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <Image className="w-4 h-4" />
        Featured Image
      </Label>

      {value ? (
        <div className="relative">
          <img
            src={value}
            alt="Featured image preview"
            className="h-40 w-full object-cover rounded-lg border"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Upload Button */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex-1"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload from Device
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="shrink-0"
            >
              <Link2 className="w-4 h-4 mr-2" />
              Use URL
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* URL Input */}
          {showUrlInput && (
            <div className="space-y-2">
              <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
              <p className="text-xs text-muted-foreground">
                Enter the full URL of an image hosted elsewhere
              </p>
            </div>
          )}

          <div className="p-4 border-2 border-dashed rounded-lg text-center text-muted-foreground text-sm">
            <Image className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Upload an image or paste a URL</p>
            <p className="text-xs mt-1">Max 5MB • JPG, PNG, GIF, WebP</p>
          </div>
        </div>
      )}
    </div>
  );
};