import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageCropper } from "@/components/ui/image-cropper";
import { 
  ArrowLeftRight, 
  Plus, 
  Trash2, 
  ChevronDown,
  ChevronUp,
  GripVertical,
  ArrowRightLeft,
  Crop
} from "lucide-react";
import { UploadedImage } from "./BusinessImageUpload";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export interface BeforeAfterPair {
  id: string;
  beforeImageUrl: string;
  afterImageUrl: string;
  title?: string;
  description?: string;
  label?: string;
}

interface BeforeAfterPairManagerProps {
  images: UploadedImage[];
  pairs: BeforeAfterPair[];
  onPairsChange: (pairs: BeforeAfterPair[]) => void;
  disabled?: boolean;
  maxPairs?: number;
}

export function BeforeAfterPairManager({
  images,
  pairs,
  onPairsChange,
  disabled = false,
  maxPairs = 5,
}: BeforeAfterPairManagerProps) {
  const [isOpen, setIsOpen] = useState(pairs.length > 0);
  const [newPair, setNewPair] = useState<{
    beforeUrl: string;
    afterUrl: string;
    title: string;
    description: string;
  }>({ beforeUrl: "", afterUrl: "", title: "", description: "" });
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [cropTarget, setCropTarget] = useState<{
    pairId: string;
    imageType: "before" | "after";
    imageUrl: string;
  } | null>(null);

  // Get available images (not already used in existing pairs or current selection)
  const getAvailableImages = (excludeUrl?: string) => {
    const usedUrls = pairs.flatMap((p) => [p.beforeImageUrl, p.afterImageUrl]);
    return images.filter(
      (img) =>
        !usedUrls.includes(img.url) &&
        img.url !== excludeUrl &&
        img.url !== newPair.beforeUrl &&
        img.url !== newPair.afterUrl
    );
  };

  const addPair = () => {
    if (!newPair.beforeUrl || !newPair.afterUrl) return;
    if (pairs.length >= maxPairs) return;

    const pair: BeforeAfterPair = {
      id: `pair-${Date.now()}`,
      beforeImageUrl: newPair.beforeUrl,
      afterImageUrl: newPair.afterUrl,
      title: newPair.title.trim() || undefined,
      description: newPair.description.trim() || undefined,
    };

    onPairsChange([...pairs, pair]);
    setNewPair({ beforeUrl: "", afterUrl: "", title: "", description: "" });
  };

  const removePair = (pairId: string) => {
    onPairsChange(pairs.filter((p) => p.id !== pairId));
  };

  const updatePairTitle = (pairId: string, title: string) => {
    onPairsChange(
      pairs.map((p) =>
        p.id === pairId ? { ...p, title: title.trim() || undefined } : p
      )
    );
  };

  const updatePairDescription = (pairId: string, description: string) => {
    onPairsChange(
      pairs.map((p) =>
        p.id === pairId ? { ...p, description: description.trim() || undefined } : p
      )
    );
  };

  const swapImages = (pairId: string) => {
    onPairsChange(
      pairs.map((p) =>
        p.id === pairId
          ? { ...p, beforeImageUrl: p.afterImageUrl, afterImageUrl: p.beforeImageUrl }
          : p
      )
    );
  };

  const handleCropComplete = (croppedImageUrl: string) => {
    if (!cropTarget) return;
    
    onPairsChange(
      pairs.map((p) => {
        if (p.id !== cropTarget.pairId) return p;
        return cropTarget.imageType === "before"
          ? { ...p, beforeImageUrl: croppedImageUrl }
          : { ...p, afterImageUrl: croppedImageUrl };
      })
    );
    setCropTarget(null);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newPairs = [...pairs];
    const [draggedItem] = newPairs.splice(draggedIndex, 1);
    newPairs.splice(dropIndex, 0, draggedItem);
    onPairsChange(newPairs);

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Need at least 2 images to create pairs
  if (images.length < 2) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="space-y-3">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center justify-between w-full p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors text-left"
            disabled={disabled}
          >
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-accent" />
              <span className="font-medium text-sm">Before & After Comparisons</span>
              {pairs.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {pairs.length} pair{pairs.length !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
            {isOpen ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            For renovation businesses: Create before/after pairs to showcase your work transformations. 
            Drag to reorder which transformation appears first.
          </p>

          {/* Existing pairs */}
          {pairs.length > 0 && (
            <div className="space-y-3">
              {pairs.map((pair, index) => (
                <Card 
                  key={pair.id} 
                  className={`overflow-hidden transition-all cursor-grab active:cursor-grabbing ${
                    draggedIndex === index ? "opacity-50 scale-95" : ""
                  } ${dragOverIndex === index ? "ring-2 ring-accent ring-offset-2" : ""}`}
                  draggable={!disabled}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">
                          #{index + 1}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => swapImages(pair.id)}
                          disabled={disabled}
                          className="h-7 px-2 text-muted-foreground hover:text-foreground"
                          title="Swap before/after"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removePair(pair.id)}
                          disabled={disabled}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Title input */}
                    <div className="mb-2">
                      <Input
                        type="text"
                        placeholder="Project title (e.g., Kitchen Renovation)..."
                        value={pair.title || ""}
                        onChange={(e) => updatePairTitle(pair.id, e.target.value)}
                        disabled={disabled}
                        className="h-8 text-xs"
                        maxLength={60}
                      />
                    </div>

                    {/* Description input */}
                    <div className="mb-3">
                      <Textarea
                        placeholder="Describe the work done (optional)..."
                        value={pair.description || ""}
                        onChange={(e) => updatePairDescription(pair.id, e.target.value)}
                        disabled={disabled}
                        className="text-xs min-h-[60px] resize-none"
                        maxLength={200}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative aspect-video rounded overflow-hidden bg-muted group">
                        <img
                          src={pair.beforeImageUrl}
                          alt="Before"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/60 text-white text-[10px] font-medium rounded">
                          Before
                        </span>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setCropTarget({
                            pairId: pair.id,
                            imageType: "before",
                            imageUrl: pair.beforeImageUrl
                          })}
                          disabled={disabled}
                          className="absolute bottom-1 right-1 h-6 px-2 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Crop className="w-3 h-3 mr-1" />
                          Crop
                        </Button>
                      </div>
                      <div className="relative aspect-video rounded overflow-hidden bg-muted group">
                        <img
                          src={pair.afterImageUrl}
                          alt="After"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/60 text-white text-[10px] font-medium rounded">
                          After
                        </span>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setCropTarget({
                            pairId: pair.id,
                            imageType: "after",
                            imageUrl: pair.afterImageUrl
                          })}
                          disabled={disabled}
                          className="absolute bottom-1 right-1 h-6 px-2 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Crop className="w-3 h-3 mr-1" />
                          Crop
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Add new pair */}
          {pairs.length < maxPairs && getAvailableImages().length >= 2 && (
            <Card className="border-dashed">
              <CardContent className="p-3">
                <Label className="text-xs font-medium mb-2 block">
                  Add New Comparison
                </Label>
                
                {/* Title for new pair */}
                <div className="mb-2">
                  <Label className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5 block">
                    Project Title (Optional)
                  </Label>
                  <Input
                    type="text"
                    placeholder="e.g., Kitchen Renovation, Bathroom Remodel..."
                    value={newPair.title}
                    onChange={(e) => setNewPair((prev) => ({ ...prev, title: e.target.value }))}
                    disabled={disabled}
                    className="h-8 text-xs"
                    maxLength={60}
                  />
                </div>

                {/* Description for new pair */}
                <div className="mb-3">
                  <Label className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5 block">
                    Description (Optional)
                  </Label>
                  <Textarea
                    placeholder="Describe the work done..."
                    value={newPair.description}
                    onChange={(e) => setNewPair((prev) => ({ ...prev, description: e.target.value }))}
                    disabled={disabled}
                    className="text-xs min-h-[60px] resize-none"
                    maxLength={200}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Before Image
                    </Label>
                    <Select
                      value={newPair.beforeUrl}
                      onValueChange={(url) =>
                        setNewPair((prev) => ({ ...prev, beforeUrl: url }))
                      }
                      disabled={disabled}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select image..." />
                      </SelectTrigger>
                      <SelectContent>
                        {images
                          .filter(
                            (img) =>
                              img.url !== newPair.afterUrl &&
                              !pairs.some(
                                (p) =>
                                  p.beforeImageUrl === img.url ||
                                  p.afterImageUrl === img.url
                              )
                          )
                          .map((img) => (
                            <SelectItem key={img.url} value={img.url}>
                              <div className="flex items-center gap-2">
                                <img
                                  src={img.url}
                                  alt={img.name}
                                  className="w-6 h-6 object-cover rounded"
                                />
                                <span className="truncate max-w-[120px]">
                                  {img.name}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {newPair.beforeUrl && (
                      <div className="aspect-video rounded overflow-hidden bg-muted">
                        <img
                          src={newPair.beforeUrl}
                          alt="Before preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      After Image
                    </Label>
                    <Select
                      value={newPair.afterUrl}
                      onValueChange={(url) =>
                        setNewPair((prev) => ({ ...prev, afterUrl: url }))
                      }
                      disabled={disabled}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select image..." />
                      </SelectTrigger>
                      <SelectContent>
                        {images
                          .filter(
                            (img) =>
                              img.url !== newPair.beforeUrl &&
                              !pairs.some(
                                (p) =>
                                  p.beforeImageUrl === img.url ||
                                  p.afterImageUrl === img.url
                              )
                          )
                          .map((img) => (
                            <SelectItem key={img.url} value={img.url}>
                              <div className="flex items-center gap-2">
                                <img
                                  src={img.url}
                                  alt={img.name}
                                  className="w-6 h-6 object-cover rounded"
                                />
                                <span className="truncate max-w-[120px]">
                                  {img.name}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {newPair.afterUrl && (
                      <div className="aspect-video rounded overflow-hidden bg-muted">
                        <img
                          src={newPair.afterUrl}
                          alt="After preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={addPair}
                  disabled={
                    disabled || !newPair.beforeUrl || !newPair.afterUrl
                  }
                  className="w-full gap-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Comparison Pair
                </Button>
              </CardContent>
            </Card>
          )}

          {pairs.length >= maxPairs && (
            <p className="text-xs text-muted-foreground text-center">
              Maximum {maxPairs} comparison pairs allowed
            </p>
          )}

          {getAvailableImages().length < 2 && pairs.length < maxPairs && (
            <p className="text-xs text-muted-foreground text-center">
              Upload more images to create additional comparison pairs
            </p>
          )}
        </CollapsibleContent>
      </div>

      {/* Image Cropper Dialog */}
      {cropTarget && (
        <ImageCropper
          image={cropTarget.imageUrl}
          open={!!cropTarget}
          onOpenChange={(open) => !open && setCropTarget(null)}
          onCropComplete={handleCropComplete}
          aspectRatio={4 / 3}
        />
      )}
    </Collapsible>
  );
}
