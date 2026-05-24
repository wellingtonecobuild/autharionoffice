/**
 * Image quality validation utilities
 * Checks resolution, file size, and image clarity before upload
 */

export interface ImageQualityResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  details: {
    width: number;
    height: number;
    fileSize: number;
    aspectRatio: number;
    megapixels: number;
  };
}

export interface QualityRequirements {
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  minFileSize?: number;
  maxFileSize?: number;
  minMegapixels?: number;
  allowedAspectRatios?: { min: number; max: number };
}

const DEFAULT_BUSINESS_IMAGE_REQUIREMENTS: QualityRequirements = {
  minWidth: 200, // Lowered to accept more images
  minHeight: 200, // Lowered to accept more images
  maxFileSize: 15 * 1024 * 1024, // 15MB max
  minFileSize: 5 * 1024, // 5KB minimum
  minMegapixels: 0.04, // Lowered to ~200x200
};

const DEFAULT_LOGO_REQUIREMENTS: QualityRequirements = {
  minWidth: 100,
  minHeight: 100,
  maxFileSize: 2 * 1024 * 1024, // 2MB
  minFileSize: 1 * 1024, // 1KB minimum
};

/**
 * Load image and get its dimensions
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image. The file may be corrupted.'));
    };

    img.src = url;
  });
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Validate image quality for business photos
 */
export async function validateBusinessImage(
  file: File,
  customRequirements?: Partial<QualityRequirements>
): Promise<ImageQualityResult> {
  const requirements = { ...DEFAULT_BUSINESS_IMAGE_REQUIREMENTS, ...customRequirements };
  return validateImageQuality(file, requirements, 'business');
}

/**
 * Validate image quality for logos
 */
export async function validateLogoImage(
  file: File,
  customRequirements?: Partial<QualityRequirements>
): Promise<ImageQualityResult> {
  const requirements = { ...DEFAULT_LOGO_REQUIREMENTS, ...customRequirements };
  return validateImageQuality(file, requirements, 'logo');
}

/**
 * Core validation function
 */
async function validateImageQuality(
  file: File,
  requirements: QualityRequirements,
  imageType: 'business' | 'logo'
): Promise<ImageQualityResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // File size validation (before loading image)
  if (requirements.maxFileSize && file.size > requirements.maxFileSize) {
    errors.push(
      `File too large (${formatFileSize(file.size)}). Maximum allowed: ${formatFileSize(requirements.maxFileSize)}`
    );
  }

  if (requirements.minFileSize && file.size < requirements.minFileSize) {
    errors.push(
      `File too small (${formatFileSize(file.size)}). This may indicate a low-quality image. Minimum: ${formatFileSize(requirements.minFileSize)}`
    );
  }

  // Load image to check dimensions
  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch (error) {
    return {
      isValid: false,
      errors: ['Unable to load image. Please ensure the file is a valid image.'],
      warnings: [],
      details: { width: 0, height: 0, fileSize: file.size, aspectRatio: 0, megapixels: 0 },
    };
  }

  const width = img.naturalWidth;
  const height = img.naturalHeight;
  const aspectRatio = width / height;
  const megapixels = (width * height) / 1000000;

  // Resolution validation
  if (requirements.minWidth && width < requirements.minWidth) {
    errors.push(
      `Image width too small (${width}px). Minimum required: ${requirements.minWidth}px. Please upload a higher resolution image.`
    );
  }

  if (requirements.minHeight && height < requirements.minHeight) {
    errors.push(
      `Image height too small (${height}px). Minimum required: ${requirements.minHeight}px. Please upload a higher resolution image.`
    );
  }

  if (requirements.maxWidth && width > requirements.maxWidth) {
    warnings.push(
      `Image width (${width}px) exceeds recommended maximum (${requirements.maxWidth}px). Image will be resized automatically.`
    );
  }

  if (requirements.maxHeight && height > requirements.maxHeight) {
    warnings.push(
      `Image height (${height}px) exceeds recommended maximum (${requirements.maxHeight}px). Image will be resized automatically.`
    );
  }

  // Megapixel validation
  if (requirements.minMegapixels && megapixels < requirements.minMegapixels) {
    errors.push(
      `Image resolution too low (${megapixels.toFixed(2)} megapixels). Minimum required: ${requirements.minMegapixels} megapixels. Please use a higher quality photo.`
    );
  }

  // Aspect ratio validation
  if (requirements.allowedAspectRatios) {
    const { min, max } = requirements.allowedAspectRatios;
    if (aspectRatio < min || aspectRatio > max) {
      warnings.push(
        `Unusual aspect ratio (${aspectRatio.toFixed(2)}). Recommended range: ${min.toFixed(1)} to ${max.toFixed(1)}`
      );
    }
  }

  // Additional quality checks for business images - relaxed to accept more images
  if (imageType === 'business') {
    // Only warn for very small images, don't reject
    if (width < 200 || height < 200) {
      warnings.push(
        'This image is quite small. For best results, use higher resolution photos.'
      );
    }
  }

  // Check for logo-specific requirements
  if (imageType === 'logo') {
    // Logos should ideally be square or close to it for best display
    if (aspectRatio < 0.5 || aspectRatio > 2) {
      warnings.push(
        'Logo has an unusual aspect ratio. Square or near-square logos display best.'
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    details: {
      width,
      height,
      fileSize: file.size,
      aspectRatio,
      megapixels,
    },
  };
}

/**
 * Get human-readable quality summary
 */
export function getQualitySummary(result: ImageQualityResult): string {
  const { width, height, megapixels } = result.details;
  const resolution = `${width}×${height}`;
  const mp = megapixels.toFixed(1);
  
  if (result.isValid) {
    if (megapixels > 2) {
      return `High quality (${resolution}, ${mp}MP)`;
    } else if (megapixels > 1) {
      return `Good quality (${resolution}, ${mp}MP)`;
    } else {
      return `Acceptable quality (${resolution}, ${mp}MP)`;
    }
  }
  
  return `Quality issues detected`;
}
