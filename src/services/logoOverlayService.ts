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
 * Remove white/light background from an image and return transparent version
 */
function removeBackground(
  logoImg: HTMLImageElement,
  threshold: number = 240 // pixels with RGB values above this are considered background
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = logoImg.width;
  canvas.height = logoImg.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Draw the logo
  ctx.drawImage(logoImg, 0, 0);

  // Get image data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Process each pixel
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Check if pixel is near-white (background)
    if (r > threshold && g > threshold && b > threshold) {
      // Make it transparent
      data[i + 3] = 0;
    }

    // Also check for very light gray backgrounds
    const brightness = (r + g + b) / 3;
    if (brightness > 250) {
      data[i + 3] = 0;
    }
  }

  // Put the modified data back
  ctx.putImageData(imageData, 0, 0);

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
        // First, contour crop the logo to remove excess whitespace
        let croppedBase64 = logoBase64;
        try {
          croppedBase64 = await contourCropImage(logoBase64, { padding: 3 });
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
