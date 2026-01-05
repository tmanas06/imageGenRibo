/**
 * Contour Crop Service
 *
 * Step 2 (Part 2): Contour trim logos to remove excess whitespace
 * This crops logos to their actual content boundaries
 */

/**
 * Find the bounding box of non-white/non-transparent content in an image
 */
function findContentBounds(
  imageData: ImageData,
  threshold: number = 250
): { top: number; left: number; bottom: number; right: number } | null {
  const { data, width, height } = imageData;

  let top = height;
  let left = width;
  let bottom = 0;
  let right = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      // Check if pixel is NOT background (not white/transparent)
      const isBackground =
        a < 10 || // Transparent
        (r > threshold && g > threshold && b > threshold); // White

      if (!isBackground) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }

  // Check if we found any content
  if (top >= bottom || left >= right) {
    return null;
  }

  return { top, left, bottom, right };
}

/**
 * Contour crop an image to remove excess whitespace/transparency
 * Returns base64 of cropped image
 */
export async function contourCropImage(
  imageBase64: string,
  options?: {
    padding?: number; // Padding around content (default: 5)
    threshold?: number; // White threshold (default: 250)
    minSize?: number; // Minimum dimension (default: 20)
  }
): Promise<string> {
  const {
    padding = 5,
    threshold = 250,
    minSize = 20
  } = options || {};

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      // Create canvas to analyze image
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Draw image
      ctx.drawImage(img, 0, 0);

      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Find content bounds
      const bounds = findContentBounds(imageData, threshold);

      if (!bounds) {
        // No content found, return original
        console.warn('No content bounds found, returning original image');
        resolve(imageBase64);
        return;
      }

      // Add padding
      const cropLeft = Math.max(0, bounds.left - padding);
      const cropTop = Math.max(0, bounds.top - padding);
      const cropRight = Math.min(canvas.width, bounds.right + padding);
      const cropBottom = Math.min(canvas.height, bounds.bottom + padding);

      const cropWidth = cropRight - cropLeft;
      const cropHeight = cropBottom - cropTop;

      // Check minimum size
      if (cropWidth < minSize || cropHeight < minSize) {
        console.warn('Cropped size too small, returning original');
        resolve(imageBase64);
        return;
      }

      // Create cropped canvas
      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = cropWidth;
      croppedCanvas.height = cropHeight;

      const croppedCtx = croppedCanvas.getContext('2d');
      if (!croppedCtx) {
        reject(new Error('Could not get cropped canvas context'));
        return;
      }

      // Draw cropped region
      croppedCtx.drawImage(
        canvas,
        cropLeft, cropTop, cropWidth, cropHeight,
        0, 0, cropWidth, cropHeight
      );

      // Return as base64
      const resultBase64 = croppedCanvas.toDataURL('image/png').split(',')[1];
      resolve(resultBase64);
    };

    img.onerror = () => reject(new Error('Failed to load image for cropping'));
    img.src = `data:image/png;base64,${imageBase64}`;
  });
}

/**
 * Contour crop multiple images
 */
export async function contourCropImages(
  images: { id: string; base64: string }[],
  options?: {
    padding?: number;
    threshold?: number;
  }
): Promise<{ id: string; base64: string; cropped: boolean }[]> {
  const results: { id: string; base64: string; cropped: boolean }[] = [];

  for (const img of images) {
    try {
      const cropped = await contourCropImage(img.base64, options);
      results.push({
        id: img.id,
        base64: cropped,
        cropped: cropped !== img.base64
      });
    } catch (error) {
      console.warn(`Failed to crop image ${img.id}:`, error);
      results.push({
        id: img.id,
        base64: img.base64,
        cropped: false
      });
    }
  }

  return results;
}

/**
 * Get image dimensions
 */
export function getImageDimensions(imageBase64: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = `data:image/png;base64,${imageBase64}`;
  });
}
