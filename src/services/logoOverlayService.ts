/**
 * Logo Overlay Service
 *
 * Overlays actual logos from component images onto the generated LBL
 * This ensures logos are exactly as uploaded, not AI recreations
 * Now with background removal for cleaner logo placement
 */

import type { ComponentData } from './componentService';

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
 * Remove white/light/colored background from slogan image
 * Uses edge detection to find the actual content and remove surrounding background
 */
function removeSloganBackground(
  img: HTMLImageElement
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Sample corners to detect background color
  const sampleSize = 10;
  let bgR = 0, bgG = 0, bgB = 0, samples = 0;

  // Sample top-left corner
  for (let y = 0; y < sampleSize && y < img.height; y++) {
    for (let x = 0; x < sampleSize && x < img.width; x++) {
      const i = (y * img.width + x) * 4;
      bgR += data[i];
      bgG += data[i + 1];
      bgB += data[i + 2];
      samples++;
    }
  }

  // Sample top-right corner
  for (let y = 0; y < sampleSize && y < img.height; y++) {
    for (let x = img.width - sampleSize; x < img.width; x++) {
      if (x >= 0) {
        const i = (y * img.width + x) * 4;
        bgR += data[i];
        bgG += data[i + 1];
        bgB += data[i + 2];
        samples++;
      }
    }
  }

  // Calculate average background color
  bgR = Math.round(bgR / samples);
  bgG = Math.round(bgG / samples);
  bgB = Math.round(bgB / samples);

  console.log('Detected slogan background color:', { bgR, bgG, bgB });

  // Remove pixels similar to background color
  const tolerance = 50; // Color similarity tolerance (increased)

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Check if pixel is similar to detected background color
    const diffR = Math.abs(r - bgR);
    const diffG = Math.abs(g - bgG);
    const diffB = Math.abs(b - bgB);

    if (diffR < tolerance && diffG < tolerance && diffB < tolerance) {
      data[i + 3] = 0; // Make transparent
    }

    // Also remove near-white pixels
    if (r > 235 && g > 235 && b > 235) {
      data[i + 3] = 0;
    }

    // Remove cyan/teal backgrounds (common in pharma branding)
    // Cyan has high G and B, lower R
    if (g > 180 && b > 200 && r < 100) {
      data[i + 3] = 0;
    }

    // Remove light cyan variations
    if (g > 150 && b > 180 && r < 120 && (g + b) > (r * 3)) {
      data[i + 3] = 0;
    }

    // Remove very light backgrounds (high brightness, low saturation)
    const brightness = (r + g + b) / 3;
    const maxChannel = Math.max(r, g, b);
    const minChannel = Math.min(r, g, b);
    const saturation = maxChannel > 0 ? (maxChannel - minChannel) / maxChannel : 0;

    if (brightness > 210 && saturation < 0.2) {
      data[i + 3] = 0;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/**
 * Extract logo components from the component array
 */
export function extractLogos(components: ComponentData[]): {
  companyLogo: string | null;
  brandLogo: string | null;
  slogan: string | null;
} {
  // COMM_04 is Company Logo
  const companyLogoComp = components.find(c => c.component_id === 'COMM_04');
  // INIT_01a is Brand Root Name (nebZmart logo)
  const brandLogoComp = components.find(c => c.component_id === 'INIT_01a');
  // INIT_08 is Slogan image
  const sloganComp = components.find(c => c.component_id === 'INIT_08');

  return {
    companyLogo: companyLogoComp?.image_base64 || null,
    brandLogo: brandLogoComp?.image_base64 || null,
    slogan: sloganComp?.image_base64 || null,
  };
}

/**
 * Overlay logos and slogan onto the generated image
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
    removeLogoBackground?: boolean;
    overlaySlogan?: boolean;
    sloganMaxWidthPercent?: number;
    sloganMaxHeightPercent?: number; // Max height as percentage
    sloganTopPercent?: number; // Position from top as percentage
  }
): Promise<string> {
  const {
    companyLogoPosition = 'top-left',
    brandLogoPosition = 'top-right',
    logoMaxWidthPercent = 12,
    logoMaxHeightPercent = 15,
    padding = 20,
    removeLogoBackground = false,
    overlaySlogan = false,
    sloganMaxWidthPercent = 35,
    sloganMaxHeightPercent = 10, // Default max height 10% of image
    sloganTopPercent = 18, // Position below headline
  } = options || {};

  const { companyLogo, brandLogo, slogan } = extractLogos(components);

  console.log('Logo overlay status:', {
    hasCompanyLogo: !!companyLogo,
    companyLogoLength: companyLogo?.length || 0,
    hasBrandLogo: !!brandLogo,
    brandLogoLength: brandLogo?.length || 0,
    hasSlogan: !!slogan,
    sloganLength: slogan?.length || 0,
    overlaySlogan
  });

  if (!companyLogo && !brandLogo && (!overlaySlogan || !slogan)) {
    console.log('No logos/slogan found in components, returning original image');
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

      // Helper to load and draw a logo
      const drawLogo = (
        logoBase64: string,
        position: 'top-left' | 'top-right'
      ): Promise<void> => {
        return new Promise((resolvelogo) => {
          const logoImg = new Image();

          logoImg.onload = () => {
            console.log(`Logo loaded for ${position}:`, logoImg.width, 'x', logoImg.height);

            // Optionally remove background from logo
            const logoSource = removeLogoBackground
              ? removeBackground(logoImg)
              : logoImg;

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

            // Calculate position - ensure logos stay within bounds
            let x: number, y: number;

            if (position === 'top-left') {
              x = padding;
              y = padding;
            } else {
              // For top-right, ensure we don't go outside
              x = Math.max(padding, mainImg.width - logoWidth - padding);
              y = padding;
            }

            // Ensure logo fits within canvas
            x = Math.max(0, Math.min(x, mainImg.width - logoWidth));
            y = Math.max(0, Math.min(y, mainImg.height - logoHeight));

            console.log(`Drawing logo at ${position}:`, { x, y, width: logoWidth, height: logoHeight });

            // Draw the logo directly (no background rectangle)
            ctx.drawImage(logoSource, x, y, logoWidth, logoHeight);

            resolvelogo();
          };

          logoImg.onerror = (err) => {
            console.error('Failed to load logo image:', err);
            resolvelogo();
          };

          // Detect image format from base64 header
          const mimeType = logoBase64.startsWith('/9j/') ? 'image/jpeg' : 'image/png';
          logoImg.src = `data:${mimeType};base64,${logoBase64}`;
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

      // Draw slogan if enabled
      if (overlaySlogan && slogan) {
        console.log('Drawing slogan overlay...');
        console.log('Slogan base64 length:', slogan.length);
        try {
          await new Promise<void>((resolveslogan) => {
            const sloganImg = new Image();
            sloganImg.onload = () => {
              console.log('Slogan image loaded:', sloganImg.width, 'x', sloganImg.height);

              // Remove white background from slogan
              const sloganSource = removeSloganBackground(sloganImg);

              // Calculate slogan dimensions with both width and height constraints
              const maxSloganWidth = (mainImg.width * sloganMaxWidthPercent) / 100;
              const maxSloganHeight = (mainImg.height * sloganMaxHeightPercent) / 100;
              let sloganWidth = sloganImg.width;
              let sloganHeight = sloganImg.height;

              // Scale down if width exceeds max
              if (sloganWidth > maxSloganWidth) {
                const scale = maxSloganWidth / sloganWidth;
                sloganWidth = maxSloganWidth;
                sloganHeight = sloganHeight * scale;
              }

              // Scale down further if height still exceeds max
              if (sloganHeight > maxSloganHeight) {
                const scale = maxSloganHeight / sloganHeight;
                sloganHeight = maxSloganHeight;
                sloganWidth = sloganWidth * scale;
              }

              // Center horizontally, position at specified top percentage
              const x = (mainImg.width - sloganWidth) / 2;
              const y = (mainImg.height * sloganTopPercent) / 100;

              console.log('Drawing slogan at:', x, y, 'size:', sloganWidth, 'x', sloganHeight);

              // Draw slogan with transparent background
              ctx.drawImage(sloganSource, x, y, sloganWidth, sloganHeight);
              resolveslogan();
            };
            sloganImg.onerror = (err) => {
              console.error('Failed to load slogan image:', err);
              resolveslogan();
            };
            // Try both png and jpeg formats
            const mimeType = slogan.startsWith('/9j/') ? 'image/jpeg' : 'image/png';
            sloganImg.src = `data:${mimeType};base64,${slogan}`;
          });
        } catch (err) {
          console.error('Error drawing slogan:', err);
        }
      } else {
        console.log('Slogan overlay skipped:', overlaySlogan ? 'no slogan data' : 'disabled');
      }

      // Return result
      const resultBase64 = canvas.toDataURL('image/png').split(',')[1];
      resolve(resultBase64);
    };

    mainImg.onerror = () => reject(new Error('Failed to load main image'));
    mainImg.src = `data:image/png;base64,${imageBase64}`;
  });
}
