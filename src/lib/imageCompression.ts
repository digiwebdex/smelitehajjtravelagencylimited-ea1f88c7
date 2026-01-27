/**
 * Client-side image compression utility
 * Compresses images before upload to reduce storage and bandwidth
 */

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  outputFormat?: "jpeg" | "webp" | "png";
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.85,
  outputFormat: "webp",
};

/**
 * Compress an image file using canvas
 * @param file - The original image file
 * @param options - Compression options
 * @returns Promise<File> - The compressed image file
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Skip compression for already small files (< 100KB)
  if (file.size < 100 * 1024) {
    return file;
  }

  // Skip compression for non-image files
  if (!file.type.startsWith("image/")) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Could not get canvas context"));
      return;
    }

    img.onload = () => {
      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img;
      const maxW = opts.maxWidth!;
      const maxH = opts.maxHeight!;

      if (width > maxW) {
        height = (height * maxW) / width;
        width = maxW;
      }
      if (height > maxH) {
        width = (width * maxH) / height;
        height = maxH;
      }

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;

      // Draw image with high quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      const mimeType = opts.outputFormat === "webp" 
        ? "image/webp" 
        : opts.outputFormat === "png" 
          ? "image/png" 
          : "image/jpeg";

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to compress image"));
            return;
          }

          // Create new file with compressed data
          const extension = opts.outputFormat === "webp" ? "webp" : opts.outputFormat === "png" ? "png" : "jpg";
          const newFileName = file.name.replace(/\.[^/.]+$/, `.${extension}`);
          
          const compressedFile = new File([blob], newFileName, {
            type: mimeType,
            lastModified: Date.now(),
          });

          // Only use compressed version if it's actually smaller
          if (compressedFile.size < file.size) {
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        },
        mimeType,
        opts.quality
      );
    };

    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };

    // Load image from file
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Check if browser supports WebP
 */
export function supportsWebP(): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.width > 0 && img.height > 0);
    img.onerror = () => resolve(false);
    img.src = "data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==";
  });
}

/**
 * Get optimal compression settings based on file type and size
 */
export function getOptimalCompressionSettings(file: File): CompressionOptions {
  const sizeInMB = file.size / (1024 * 1024);
  
  if (sizeInMB > 5) {
    // Very large files: aggressive compression
    return {
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 0.7,
      outputFormat: "webp",
    };
  } else if (sizeInMB > 2) {
    // Large files: moderate compression
    return {
      maxWidth: 1920,
      maxHeight: 1920,
      quality: 0.8,
      outputFormat: "webp",
    };
  } else if (sizeInMB > 0.5) {
    // Medium files: light compression
    return {
      maxWidth: 2048,
      maxHeight: 2048,
      quality: 0.85,
      outputFormat: "webp",
    };
  }
  
  // Small files: minimal compression, preserve quality
  return {
    maxWidth: 2560,
    maxHeight: 2560,
    quality: 0.9,
    outputFormat: "webp",
  };
}
