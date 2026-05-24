import * as React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Columns, SlidersHorizontal, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface FullscreenComparisonProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pairs: {
    id: string;
    beforeImageUrl: string;
    afterImageUrl: string;
    title?: string;
    description?: string;
  }[];
  initialIndex?: number;
}

type ViewMode = "slider" | "sideBySide";

export function FullscreenComparison({
  open,
  onOpenChange,
  pairs,
  initialIndex = 0,
}: FullscreenComparisonProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex);
  const [sliderPosition, setSliderPosition] = React.useState(50);
  const [isDragging, setIsDragging] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<ViewMode>("slider");
  
  // Touch gesture states
  const [scale, setScale] = React.useState(1);
  const [translateX, setTranslateX] = React.useState(0);
  const [translateY, setTranslateY] = React.useState(0);
  const [initialDistance, setInitialDistance] = React.useState<number | null>(null);
  const [initialScale, setInitialScale] = React.useState(1);
  const [touchStart, setTouchStart] = React.useState<{ x: number; y: number } | null>(null);
  const [swipeStartX, setSwipeStartX] = React.useState<number | null>(null);
  const [lastPanPosition, setLastPanPosition] = React.useState<{ x: number; y: number } | null>(null);

  const currentPair = pairs[currentIndex];

  React.useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setSliderPosition(50);
      resetZoom();
    }
  }, [open, initialIndex]);

  const resetZoom = () => {
    setScale(1);
    setTranslateX(0);
    setTranslateY(0);
  };

  const handleMove = React.useCallback((clientX: number) => {
    if (!containerRef.current || scale > 1) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, [scale]);

  const handleMouseMove = React.useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      handleMove(e.clientX);
    },
    [isDragging, handleMove]
  );

  // Calculate distance between two touch points
  const getDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = React.useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch zoom start
      e.preventDefault();
      const distance = getDistance(e.touches);
      setInitialDistance(distance);
      setInitialScale(scale);
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      setTouchStart({ x: touch.clientX, y: touch.clientY });
      setSwipeStartX(touch.clientX);
      
      if (scale > 1) {
        // Pan mode when zoomed
        setLastPanPosition({ x: touch.clientX, y: touch.clientY });
      }
    }
  }, [scale]);

  const handleTouchMove = React.useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialDistance !== null) {
      // Pinch zoom
      e.preventDefault();
      const currentDistance = getDistance(e.touches);
      const scaleChange = currentDistance / initialDistance;
      const newScale = Math.min(Math.max(initialScale * scaleChange, 1), 4);
      setScale(newScale);
      
      if (newScale === 1) {
        setTranslateX(0);
        setTranslateY(0);
      }
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      
      if (scale > 1 && lastPanPosition) {
        // Pan when zoomed
        e.preventDefault();
        const deltaX = touch.clientX - lastPanPosition.x;
        const deltaY = touch.clientY - lastPanPosition.y;
        setTranslateX(prev => prev + deltaX);
        setTranslateY(prev => prev + deltaY);
        setLastPanPosition({ x: touch.clientX, y: touch.clientY });
      } else if (viewMode === "slider" && isDragging) {
        // Slider mode
        handleMove(touch.clientX);
      }
    }
  }, [initialDistance, initialScale, scale, lastPanPosition, viewMode, isDragging, handleMove]);

  const handleTouchEnd = React.useCallback((e: React.TouchEvent) => {
    // Swipe to navigate (only when not zoomed)
    if (scale === 1 && swipeStartX !== null && touchStart !== null && e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - swipeStartX;
      const deltaY = Math.abs(touch.clientY - touchStart.y);
      
      // Only trigger swipe if horizontal movement is significant and vertical is minimal
      if (Math.abs(deltaX) > 80 && deltaY < 100) {
        if (deltaX > 0 && currentIndex > 0) {
          setCurrentIndex(currentIndex - 1);
          setSliderPosition(50);
        } else if (deltaX < 0 && currentIndex < pairs.length - 1) {
          setCurrentIndex(currentIndex + 1);
          setSliderPosition(50);
        }
      }
    }
    
    setInitialDistance(null);
    setTouchStart(null);
    setSwipeStartX(null);
    setLastPanPosition(null);
    setIsDragging(false);
  }, [scale, swipeStartX, touchStart, currentIndex, pairs.length]);

  React.useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, []);

  // Keyboard navigation
  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
        setSliderPosition(50);
        resetZoom();
      } else if (e.key === "ArrowRight" && currentIndex < pairs.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setSliderPosition(50);
        resetZoom();
      } else if (e.key === "Escape") {
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, currentIndex, pairs.length, onOpenChange]);

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    const newScale = Math.max(scale - 0.5, 1);
    setScale(newScale);
    if (newScale === 1) {
      setTranslateX(0);
      setTranslateY(0);
    }
  };

  if (!currentPair) return null;

  const imageTransformStyle = {
    transform: `scale(${scale}) translate(${translateX / scale}px, ${translateY / scale}px)`,
    transition: isDragging || initialDistance ? 'none' : 'transform 0.2s ease-out',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[95vh] p-0 bg-black/95 border-none">
        <div className="relative w-full h-[85vh] flex flex-col">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
            <div className="text-white">
              {currentPair.title && (
                <h3 className="text-lg font-semibold">{currentPair.title}</h3>
              )}
              {pairs.length > 1 && (
                <p className="text-sm text-white/70">
                  {currentIndex + 1} of {pairs.length}
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex bg-black/50 rounded-lg p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setViewMode("slider"); resetZoom(); }}
                  className={cn(
                    "h-8 px-3 text-white",
                    viewMode === "slider" ? "bg-white/20" : "hover:bg-white/10"
                  )}
                >
                  <SlidersHorizontal className="w-4 h-4 mr-1.5" />
                  <span className="hidden sm:inline">Slider</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setViewMode("sideBySide"); resetZoom(); }}
                  className={cn(
                    "h-8 px-3 text-white",
                    viewMode === "sideBySide" ? "bg-white/20" : "hover:bg-white/10"
                  )}
                >
                  <Columns className="w-4 h-4 mr-1.5" />
                  <span className="hidden sm:inline">Side by Side</span>
                </Button>
              </div>
              
              {/* Zoom Controls */}
              <div className="flex bg-black/50 rounded-lg p-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomOut}
                  disabled={scale <= 1}
                  className="h-8 w-8 text-white hover:bg-white/20 disabled:opacity-40"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="flex items-center justify-center text-white text-xs w-12">
                  {Math.round(scale * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomIn}
                  disabled={scale >= 4}
                  className="h-8 w-8 text-white hover:bg-white/20 disabled:opacity-40"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="text-white hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Comparison View */}
          <div
            ref={containerRef}
            className={cn(
              "flex-1 relative select-none overflow-hidden",
              viewMode === "slider" && scale === 1 && "cursor-ew-resize"
            )}
            onMouseMove={handleMouseMove}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {viewMode === "slider" ? (
              // Slider Mode
              <>
                {/* After Image */}
                <img
                  src={currentPair.afterImageUrl}
                  alt="After"
                  className="absolute inset-0 w-full h-full object-contain"
                  style={imageTransformStyle}
                  draggable={false}
                />

                {/* Before Image (Clipped) */}
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                >
                  <img
                    src={currentPair.beforeImageUrl}
                    alt="Before"
                    className="absolute inset-0 w-full h-full object-contain"
                    style={imageTransformStyle}
                    draggable={false}
                  />
                </div>

                {/* Slider Line */}
                {scale === 1 && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10"
                    style={{ left: `${sliderPosition}%`, transform: "translateX(-50%)" }}
                  >
                    {/* Slider Handle */}
                    <div
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center cursor-ew-resize border-2 border-accent"
                      onMouseDown={() => setIsDragging(true)}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        setIsDragging(true);
                      }}
                    >
                      <div className="flex items-center gap-0.5">
                        <svg
                          className="w-4 h-4 text-accent rotate-180"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M9 5l7 7-7 7V5z" />
                        </svg>
                        <svg
                          className="w-4 h-4 text-accent"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M9 5l7 7-7 7V5z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}

                {/* Labels */}
                {scale === 1 && (
                  <>
                    <div className="absolute top-20 left-4 px-3 py-1.5 bg-black/70 text-white text-sm font-medium rounded">
                      Before
                    </div>
                    <div className="absolute top-20 right-4 px-3 py-1.5 bg-black/70 text-white text-sm font-medium rounded">
                      After
                    </div>
                  </>
                )}
              </>
            ) : (
              // Side by Side Mode
              <div className="flex h-full gap-2 p-2">
                <div className="flex-1 relative flex flex-col">
                  <div className="absolute top-2 left-2 px-3 py-1.5 bg-black/70 text-white text-sm font-medium rounded z-10">
                    Before
                  </div>
                  <img
                    src={currentPair.beforeImageUrl}
                    alt="Before"
                    className="w-full h-full object-contain"
                    style={imageTransformStyle}
                    draggable={false}
                  />
                </div>
                <div className="flex-1 relative flex flex-col">
                  <div className="absolute top-2 right-2 px-3 py-1.5 bg-black/70 text-white text-sm font-medium rounded z-10">
                    After
                  </div>
                  <img
                    src={currentPair.afterImageUrl}
                    alt="After"
                    className="w-full h-full object-contain"
                    style={imageTransformStyle}
                    draggable={false}
                  />
                </div>
              </div>
            )}

            {/* Navigation Arrows */}
            {pairs.length > 1 && scale === 1 && (
              <>
                {currentIndex > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/50 text-white hover:bg-black/70"
                    onClick={() => {
                      setCurrentIndex(currentIndex - 1);
                      setSliderPosition(50);
                      resetZoom();
                    }}
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </Button>
                )}
                {currentIndex < pairs.length - 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/50 text-white hover:bg-black/70"
                    onClick={() => {
                      setCurrentIndex(currentIndex + 1);
                      setSliderPosition(50);
                      resetZoom();
                    }}
                  >
                    <ChevronRight className="w-6 h-6" />
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Footer with description */}
          {currentPair.description && (
            <div className="absolute bottom-12 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/60 to-transparent">
              <p className="text-white/90 text-center text-sm max-w-2xl mx-auto">
                {currentPair.description}
              </p>
            </div>
          )}

          {/* Thumbnail navigation for multiple pairs */}
          {pairs.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
              {pairs.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setSliderPosition(50);
                    resetZoom();
                  }}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    idx === currentIndex
                      ? "bg-white w-6"
                      : "bg-white/50 hover:bg-white/80"
                  )}
                />
              ))}
            </div>
          )}

          {/* Mobile gesture hint */}
          {scale === 1 && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 text-white/50 text-xs text-center sm:hidden">
              Pinch to zoom • Swipe to navigate
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
