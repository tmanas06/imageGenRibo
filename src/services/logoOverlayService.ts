/**
 * Logo Overlay Service
 *
 * Overlays actual logos from component images onto the generated LBL
 * This ensures logos are exactly as uploaded, not AI recreations
 * Now with background removal and contour cropping for cleaner logo placement
 */

import type { ComponentData } from './componentService';
import { contourCropImage } from './contourCropService';

/**
 * Detect background color by sampling corners of the image
 */
function detectLogoBackgroundColor(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): { r: number; g: number; b: number } {
  // Sample corners
  const samplePoints = [
    { x: 2, y: 2 },
    { x: width - 3, y: 2 },
    { x: 2, y: height - 3 },
    { x: width - 3, y: height - 3 },
  ];

  const colors: { r: number; g: number; b: number }[] = [];

  for (const point of samplePoints) {
    const pixel = ctx.getImageData(point.x, point.y, 1, 1).data;
    colors.push({ r: pixel[0], g: pixel[1], b: pixel[2] });
  }

  // Find most common color (average similar ones)
  const tolerance = 30;
  let bestGroup: typeof colors = [colors[0]];

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

  const avgR = Math.round(bestGroup.reduce((s, c) => s + c.r, 0) / bestGroup.length);
  const avgG = Math.round(bestGroup.reduce((s, c) => s + c.g, 0) / bestGroup.length);
  const avgB = Math.round(bestGroup.reduce((s, c) => s + c.b, 0) / bestGroup.length);

  return { r: avgR, g: avgG, b: avgB };
}

/**
 * Remove background from an image and return transparent version
 * Auto-detects background color from corners
 */
function removeBackground(
  logoImg: HTMLImageElement,
  tolerance: number = 50 // color tolerance for background detection
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = logoImg.width;
  canvas.height = logoImg.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Draw the logo
  ctx.drawImage(logoImg, 0, 0);

  // Detect background color from corners
  const bgColor = detectLogoBackgroundColor(ctx, canvas.width, canvas.height);
  console.log(`[RemoveBackground] Detected background: RGB(${bgColor.r}, ${bgColor.g}, ${bgColor.b})`);

  // Get image data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Process each pixel
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Check if pixel matches detected background color
    const colorDiff = Math.abs(r - bgColor.r) +
                      Math.abs(g - bgColor.g) +
                      Math.abs(b - bgColor.b);

    if (colorDiff < tolerance * 3) {
      // Make it transparent
      data[i + 3] = 0;
    }

    // Also check for near-white backgrounds (always remove)
    if (r > 245 && g > 245 && b > 245) {
      data[i + 3] = 0;
    }
  }

  // Put the modified data back
  ctx.putImageData(imageData, 0, 0);

  console.log(`[RemoveBackground] Background removed successfully`);

  return canvas;
}

export interface LogoOverlayConfig {
  companyLogo?: {
    base64: string;
    position: 'top-left' | 'top-right';
    maxWidth: number;  // percentage of image width
    maxHeight: number; // percentage of image height
    padding: number;   // pixels from edge
  };
  brandLogo?: {
    base64: string;
    position: 'top-left' | 'top-right';
    maxWidth: number;
    maxHeight: number;
    padding: number;
  };
}

/**
 * Extract logo components from the component array
 */
export function extractLogos(components: ComponentData[]): {
  companyLogo: string | null;
  brandLogo: string | null;
} {
  // COMM_04 is Company Logo
  const companyLogoComp = components.find(c => c.component_id === 'COMM_04');
  // INIT_02 is Brand Logo
  const brandLogoComp = components.find(c => c.component_id === 'INIT_02');

  return {
    companyLogo: companyLogoComp?.image_base64 || null,
    brandLogo: brandLogoComp?.image_base64 || null,
  };
}

/**
 * Overlay logos onto the generated image
 */
export async function overlayLogos(
  imageBase64: string,
  components: ComponentData[],
  options?: {
    companyLogoPosition?: 'top-left' | 'top-right';
    brandLogoPosition?: 'top-left' | 'top-right';
    logoMaxWidthPercent?: number;
    logoMaxHeightPercent?: number;
    padding?: number;
  }
): Promise<string> {
  const {
    companyLogoPosition = 'top-left',
    brandLogoPosition = 'top-right',
    logoMaxWidthPercent = 12,
    logoMaxHeightPercent = 15,
    padding = 20,
  } = options || {};

  const { companyLogo, brandLogo } = extractLogos(components);

  console.log('=== LOGO OVERLAY DEBUG ===');
  console.log('Company logo (COMM_04) found:', !!companyLogo, companyLogo ? `${companyLogo.length} chars` : 'null');
  console.log('Brand logo (INIT_02) found:', !!brandLogo, brandLogo ? `${brandLogo.length} chars` : 'null');

  if (!companyLogo && !brandLogo) {
    console.log('No logos found in components, returning original image');
    return imageBase64;
  }

  return new Promise((resolve, reject) => {
    const mainImg = new Image();

    mainImg.onload = async () => {
      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = mainImg.width;
      canvas.height = mainImg.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Draw the main image
      ctx.drawImage(mainImg, 0, 0);

      // Calculate max logo dimensions
      const maxLogoWidth = (mainImg.width * logoMaxWidthPercent) / 100;
      const maxLogoHeight = (mainImg.height * logoMaxHeightPercent) / 100;

      // Helper to load and draw a logo with contour crop and background removal
      const drawLogo = async (
        logoBase64: string,
        position: 'top-left' | 'top-right'
      ): Promise<void> => {
        console.log(`Drawing logo at ${position}, original size: ${logoBase64.length} chars`);

        // First, contour crop the logo to remove excess whitespace
        let croppedBase64 = logoBase64;
        try {
          console.log('Attempting contour crop...');
          croppedBase64 = await contourCropImage(logoBase64, { padding: 3 });
          const didCrop = croppedBase64 !== logoBase64;
          console.log(`Contour crop ${didCrop ? 'SUCCESS' : 'no change'}, new size: ${croppedBase64.length} chars`);
        } catch (cropErr) {
          console.warn('Contour crop failed, using original:', cropErr);
        }

        return new Promise((resolvelogo) => {
          const logoImg = new Image();

          logoImg.onload = () => {
            // Remove background from logo
            const transparentLogo = removeBackground(logoImg);

            // Calculate scaled dimensions while maintaining aspect ratio
            let logoWidth = logoImg.width;
            let logoHeight = logoImg.height;

            if (logoWidth > maxLogoWidth) {
              const scale = maxLogoWidth / logoWidth;
              logoWidth = maxLogoWidth;
              logoHeight = logoHeight * scale;
            }

            if (logoHeight > maxLogoHeight) {
              const scale = maxLogoHeight / logoHeight;
              logoHeight = maxLogoHeight;
              logoWidth = logoWidth * scale;
            }

            // Calculate position
            let x: number, y: number;

            if (position === 'top-left') {
              x = padding;
              y = padding;
            } else {
              x = mainImg.width - logoWidth - padding;
              y = padding;
            }

            // Draw the logo directly (no background rectangle)
            ctx.drawImage(transparentLogo, x, y, logoWidth, logoHeight);

            resolvelogo();
          };

          logoImg.onerror = () => {
            console.warn('Failed to load logo image');
            resolvelogo();
          };

          logoImg.src = `data:image/png;base64,${croppedBase64}`;
        });
      };

      // Draw logos
      try {
        if (companyLogo) {
          await drawLogo(companyLogo, companyLogoPosition);
        }
        if (brandLogo) {
          await drawLogo(brandLogo, brandLogoPosition);
        }
      } catch (err) {
        console.error('Error drawing logos:', err);
      }

      // Return result
      const resultBase64 = canvas.toDataURL('image/png').split(',')[1];
      resolve(resultBase64);
    };

    mainImg.onerror = () => reject(new Error('Failed to load main image'));
    mainImg.src = `data:image/png;base64,${imageBase64}`;
  });
}
