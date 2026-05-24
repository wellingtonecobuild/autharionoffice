import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface ProgressiveImageProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  placeholderClassName?: string;
  blurPlaceholder?: string;
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  onClick?: () => void;
  loading?: "lazy" | "eager";
  aspectRatio?: string;
}

export function ProgressiveImage({
  src,
  alt,
  className,
  containerClassName,
  placeholderClassName,
  blurPlaceholder,
  onError,
  onClick,
  loading = "lazy",
  aspectRatio,
}: ProgressiveImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(loading === "eager");
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (loading === "eager") {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: "100px", // Start loading 100px before entering viewport
        threshold: 0.01,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [loading]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setHasError(true);
    onError?.(e);
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden", containerClassName)}
      style={aspectRatio ? { aspectRatio } : undefined}
      onClick={onClick}
    >
      {/* Blur placeholder or skeleton */}
      {!isLoaded && !hasError && (
        <>
          {blurPlaceholder ? (
            <img
              src={blurPlaceholder}
              alt=""
              aria-hidden="true"
              className={cn(
                "absolute inset-0 w-full h-full object-cover filter blur-lg scale-110",
                placeholderClassName
              )}
            />
          ) : (
            <Skeleton className="absolute inset-0 w-full h-full" />
          )}
        </>
      )}

      {/* Main image */}
      {isInView && (
        <img
          src={src}
          alt={alt}
          loading={loading}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            "w-full h-full transition-opacity duration-500",
            isLoaded ? "opacity-100" : "opacity-0",
            className
          )}
        />
      )}

      {/* Loading indicator overlay */}
      {!isLoaded && !hasError && isInView && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
