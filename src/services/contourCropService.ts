/**
 * Contour Crop Service
 *
 * Step 2 (Part 2): Contour trim logos to remove excess whitespace
 * This crops logos to their actual content boundaries
 */

/**
 * Get the dominant background color by sampling corners
 */
function detectBackgroundColor(
  imageData: ImageData
): { r: number; g: number; b: number } {
  const { data, width, height } = imageData;

  // Sample corners (5 pixels in from each corner)
  const samplePoints = [
    { x: 2, y: 2 },                    // top-left
    { x: width - 3, y: 2 },            // top-right
    { x: 2, y: height - 3 },           // bottom-left
    { x: width - 3, y: height - 3 },   // bottom-right
    { x: Math.floor(width / 2), y: 2 }, // top-center
    { x: 2, y: Math.floor(height / 2) }, // left-center
  ];

  const colors: { r: number; g: number; b: number }[] = [];

  for (const point of samplePoints) {
    const idx = (point.y * width + point.x) * 4;
    colors.push({
      r: data[idx],
      g: data[idx + 1],
      b: data[idx + 2]
    });
  }

  // Find the most common color (simple approach: average of similar colors)
  // Group colors that are within tolerance
  const tolerance = 30;
  let bestGroup: typeof colors = [];

  for (let i = 0; i < colors.length; i++) {
    const group = [colors[i]];
    for (let j = 0; j < colors.length; j++) {
      if (i !== j) {
        const diff = Math.abs(colors[i].r - colors[j].r) +
                     Math.abs(colors[i].g - colors[j].g) +
                     Math.abs(colors[i].b - colors[j].b);
        if (diff < tolerance * 3) {
          group.push(colors[j]);
        }
      }
    }
    if (group.length > bestGroup.length) {
      bestGroup = group;
    }
  }

  // Average the best group
  const avgR = Math.round(bestGroup.reduce((s, c) => s + c.r, 0) / bestGroup.length);
  const avgG = Math.round(bestGroup.reduce((s, c) => s + c.g, 0) / bestGroup.length);
  const avgB = Math.round(bestGroup.reduce((s, c) => s + c.b, 0) / bestGroup.length);

  console.log(`[ContourCrop] Detected background color: RGB(${avgR}, ${avgG}, ${avgB})`);

  return { r: avgR, g: avgG, b: avgB };
}

/**
 * Find the bounding box of content (non-background) in an image
 * Detects background color automatically from corners
 */
function findContentBounds(
  imageData: ImageData,
  tolerance: number = 40
): { top: number; left: number; bottom: number; right: number } | null {
  const { data, width, height } = imageData;

  // Detect background color from corners
  const bgColor = detectBackgroundColor(imageData);

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

      // Check if pixel is NOT background
      const colorDiff = Math.abs(r - bgColor.r) +
                        Math.abs(g - bgColor.g) +
                        Math.abs(b - bgColor.b);

      const isBackground =
        a < 10 || // Transparent
        colorDiff < tolerance * 3; // Similar to detected background

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
    tolerance?: number; // Color tolerance for background detection (default: 40)
    minSize?: number; // Minimum dimension (default: 20)
  }
): Promise<string> {
  const {
    padding = 5,
    tolerance = 40,
    minSize = 20
  } = options || {};

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      console.log(`[ContourCrop] Image loaded: ${img.width}x${img.height}`);

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

      // Find content bounds (auto-detects background color)
      const bounds = findContentBounds(imageData, tolerance);

      if (!bounds) {
        // No content found, return original
        console.warn('[ContourCrop] No content bounds found, returning original image');
        resolve(imageBase64);
        return;
      }

      console.log(`[ContourCrop] Content bounds found: top=${bounds.top}, left=${bounds.left}, bottom=${bounds.bottom}, right=${bounds.right}`);

      // Add padding
      const cropLeft = Math.max(0, bounds.left - padding);
      const cropTop = Math.max(0, bounds.top - padding);
      const cropRight = Math.min(canvas.width, bounds.right + padding);
      const cropBottom = Math.min(canvas.height, bounds.bottom + padding);

      const cropWidth = cropRight - cropLeft;
      const cropHeight = cropBottom - cropTop;

      console.log(`[ContourCrop] Crop dimensions: ${cropWidth}x${cropHeight} (original: ${img.width}x${img.height})`);

      // Check minimum size
      if (cropWidth < minSize || cropHeight < minSize) {
        console.warn('[ContourCrop] Cropped size too small, returning original');
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
    tolerance?: number;
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
