/**
 * Image optimization utilities for resizing, enhancing, and compressing images
 * before upload to ensure HD quality display on the website.
 */

interface OptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  minWidth?: number;
  minHeight?: number;
  quality?: number;
  format?: 'image/jpeg' | 'image/webp' | 'image/png';
  enhanceToHD?: boolean;
}

interface OptimizedImage {
  blob: Blob;
  width: number;
  height: number;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  wasUpscaled: boolean;
}

// HD minimum dimensions - ensures all images meet HD quality standards
const HD_MIN_WIDTH = 1280;
const HD_MIN_HEIGHT = 720;
const HD_TARGET_WIDTH = 1920;
const HD_TARGET_HEIGHT = 1080;

const DEFAULT_OPTIONS: OptimizationOptions = {
  maxWidth: 1920,
  maxHeight: 1080,
  minWidth: HD_MIN_WIDTH,
  minHeight: HD_MIN_HEIGHT,
  quality: 0.92, // Higher quality for HD
  format: 'image/webp',
  enhanceToHD: true,
};

/**
 * Load an image from a File or Blob
 */
export function loadImageFromFile(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
}

/**
 * Calculate new dimensions for HD enhancement
 * - Upscales small images to meet HD minimum
 * - Downscales very large images to save bandwidth
 * - Maintains aspect ratio
 */
function calculateHDDimensions(
  originalWidth: number,
  originalHeight: number,
  options: OptimizationOptions
): { width: number; height: number; wasUpscaled: boolean } {
  const { maxWidth = HD_TARGET_WIDTH, maxHeight = HD_TARGET_HEIGHT, minWidth = HD_MIN_WIDTH, minHeight = HD_MIN_HEIGHT } = options;
  
  let width = originalWidth;
  let height = originalHeight;
  let wasUpscaled = false;
  const aspectRatio = width / height;

  // Check if image needs upscaling to meet HD minimum
  if (width < minWidth && height < minHeight) {
    wasUpscaled = true;
    // Upscale to meet minimum HD dimensions while maintaining aspect ratio
    if (aspectRatio > 1) {
      // Landscape: scale based on width
      width = minWidth;
      height = Math.round(width / aspectRatio);
    } else {
      // Portrait or square: scale based on height
      height = minHeight;
      width = Math.round(height * aspectRatio);
    }
  } else if (width < minWidth) {
    // Width too small, upscale
    wasUpscaled = true;
    width = minWidth;
    height = Math.round(width / aspectRatio);
  } else if (height < minHeight) {
    // Height too small, upscale
    wasUpscaled = true;
    height = minHeight;
    width = Math.round(height * aspectRatio);
  }

  // Now check if we need to downscale (image too large)
  if (width > maxWidth || height > maxHeight) {
    if (aspectRatio > 1) {
      width = Math.min(width, maxWidth);
      height = Math.round(width / aspectRatio);
    } else {
      height = Math.min(height, maxHeight);
      width = Math.round(height * aspectRatio);
    }

    // Double-check limits
    if (width > maxWidth) {
      width = maxWidth;
      height = Math.round(width / aspectRatio);
    }
    if (height > maxHeight) {
      height = maxHeight;
      width = Math.round(height * aspectRatio);
    }
  }

  return { width, height, wasUpscaled };
}

/**
 * Apply sharpening filter for HD enhancement
 */
function applySharpening(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  try {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const tempData = new Uint8ClampedArray(data);
    
    // Unsharp mask kernel (sharpening)
    const sharpenAmount = 0.3; // Subtle sharpening
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        
        for (let c = 0; c < 3; c++) { // RGB channels only
          const center = tempData[idx + c];
          const neighbors = (
            tempData[((y - 1) * width + x) * 4 + c] +
            tempData[((y + 1) * width + x) * 4 + c] +
            tempData[(y * width + (x - 1)) * 4 + c] +
            tempData[(y * width + (x + 1)) * 4 + c]
          ) / 4;
          
          // Apply unsharp mask
          const sharpened = center + (center - neighbors) * sharpenAmount;
          data[idx + c] = Math.max(0, Math.min(255, sharpened));
        }
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
  } catch (e) {
    // If sharpening fails (e.g., CORS), continue without it
    console.warn('Sharpening skipped:', e);
  }
}

/**
 * Apply brightness, contrast and saturation enhancement for clean, bright HD quality
 */
function applyEnhancement(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  try {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // Enhanced settings for bright, clean look
    const brightnessFactor = 1.15; // 15% brightness boost
    const contrastFactor = 1.08; // 8% contrast increase
    const saturationFactor = 1.12; // 12% saturation increase
    
    for (let i = 0; i < data.length; i += 4) {
      // Apply brightness first
      let r = data[i] * brightnessFactor;
      let g = data[i + 1] * brightnessFactor;
      let b = data[i + 2] * brightnessFactor;
      
      // Apply contrast (centered at 128)
      r = ((r - 128) * contrastFactor) + 128;
      g = ((g - 128) * contrastFactor) + 128;
      b = ((b - 128) * contrastFactor) + 128;
      
      // Apply saturation boost
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray + (r - gray) * saturationFactor;
      g = gray + (g - gray) * saturationFactor;
      b = gray + (b - gray) * saturationFactor;
      
      // Clamp values and apply
      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }
    
    ctx.putImageData(imageData, 0, 0);
  } catch (e) {
    console.warn('Enhancement skipped:', e);
  }
}

/**
 * Create a thumbnail version of an image
 */
export async function createThumbnail(
  file: File | Blob,
  size: number = 200
): Promise<Blob> {
  const img = await loadImageFromFile(file);
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Calculate dimensions for square thumbnail
  const minDimension = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - minDimension) / 2;
  const sy = (img.naturalHeight - minDimension) / 2;

  canvas.width = size;
  canvas.height = size;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, minDimension, minDimension, 0, 0, size, size);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create thumbnail'));
        }
      },
      'image/webp',
      0.85
    );
  });
}

/**
 * Create a blur placeholder (tiny base64 image)
 */
export async function createBlurPlaceholder(
  file: File | Blob,
  size: number = 20
): Promise<string> {
  const img = await loadImageFromFile(file);
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  const aspectRatio = img.naturalWidth / img.naturalHeight;
  let width = size;
  let height = size;
  
  if (aspectRatio > 1) {
    height = Math.round(size / aspectRatio);
  } else {
    width = Math.round(size * aspectRatio);
  }

  canvas.width = width;
  canvas.height = height;

  ctx.drawImage(img, 0, 0, width, height);

  return canvas.toDataURL('image/webp', 0.1);
}

/**
 * Optimize and enhance an image to HD quality
 * - Upscales small images to HD minimum (1280x720)
 * - Applies sharpening for clarity
 * - Applies subtle contrast/saturation enhancement
 * - Compresses with high quality settings
 */
export async function optimizeImage(
  file: File,
  options: OptimizationOptions = {}
): Promise<OptimizedImage> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const img = await loadImageFromFile(file);

  const { width, height, wasUpscaled } = calculateHDDimensions(
    img.naturalWidth,
    img.naturalHeight,
    opts
  );

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  canvas.width = width;
  canvas.height = height;

  // Use high-quality image smoothing for resizing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // For upscaled images, use multi-step resize for better quality
  if (wasUpscaled && opts.enhanceToHD) {
    // Step 1: Draw at intermediate size for smoother upscaling
    const intermediateCanvas = document.createElement('canvas');
    const intermediateCtx = intermediateCanvas.getContext('2d');
    
    if (intermediateCtx) {
      const intermediateWidth = Math.round((img.naturalWidth + width) / 2);
      const intermediateHeight = Math.round((img.naturalHeight + height) / 2);
      
      intermediateCanvas.width = intermediateWidth;
      intermediateCanvas.height = intermediateHeight;
      intermediateCtx.imageSmoothingEnabled = true;
      intermediateCtx.imageSmoothingQuality = 'high';
      intermediateCtx.drawImage(img, 0, 0, intermediateWidth, intermediateHeight);
      
      // Step 2: Draw from intermediate to final
      ctx.drawImage(intermediateCanvas, 0, 0, width, height);
    } else {
      ctx.drawImage(img, 0, 0, width, height);
    }
    
    // Apply enhancements for upscaled images
    applyEnhancement(ctx, width, height);
    applySharpening(ctx, width, height);
  } else {
    ctx.drawImage(img, 0, 0, width, height);
    
    // Apply brightness enhancement and sharpening for all images
    if (opts.enhanceToHD) {
      applyEnhancement(ctx, width, height);
      applySharpening(ctx, width, height);
    }
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve({
            blob,
            width,
            height,
            originalSize: file.size,
            optimizedSize: blob.size,
            compressionRatio: Math.round((1 - blob.size / file.size) * 100),
            wasUpscaled,
          });
        } else {
          reject(new Error('Failed to optimize image'));
        }
      },
      opts.format,
      opts.quality
    );
  });
}

/**
 * Convert optimized blob to File object
 */
export function blobToFile(blob: Blob, originalName: string): File {
  // Determine file extension based on blob type
  const extension = blob.type === 'image/webp' ? 'webp' : 
                   blob.type === 'image/png' ? 'png' : 'jpg';
  
  const baseName = originalName.replace(/\.[^/.]+$/, '');
  const fileName = `${baseName}.${extension}`;

  return new File([blob], fileName, { type: blob.type });
}

/**
 * Check if browser supports WebP
 */
export async function supportsWebP(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;

  return canvas.toDataURL('image/webp').startsWith('data:image/webp');
}

/**
 * Get optimal format based on browser support
 */
export async function getOptimalFormat(): Promise<'image/webp' | 'image/jpeg'> {
  const webpSupported = await supportsWebP();
  return webpSupported ? 'image/webp' : 'image/jpeg';
}
