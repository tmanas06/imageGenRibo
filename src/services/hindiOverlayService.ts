/**
 * Enhanced Text Overlay Service
 * - Samples background color from image
 * - Covers English text with background color
 * - Overlays Hindi text cleanly
 */

export interface TextRegion {
  id: string;
  hindiText: string;
  x: number;           // X position (percentage 0-100)
  y: number;           // Y position (percentage 0-100)
  width: number;       // Width (percentage)
  height: number;      // Height (percentage)
  fontSize: number;    // Font size (will scale)
  fontWeight: 'normal' | 'bold';
  textAlign: 'left' | 'center' | 'right';
  textColor: string;   // Text color (hex)
  coverArea?: {        // Area to cover with background (optional)
    x: number;
    y: number;
    width: number;
    height: number;
  };
  useBackgroundSample?: boolean;  // Sample background color from image
  samplePoint?: { x: number; y: number };  // Where to sample background color
  backgroundColor?: string;  // Or use fixed background color
}

export interface OverlayConfig {
  regions: TextRegion[];
  defaultBackgroundColor?: string;  // Fallback color
  fontFamily?: string;
}

/**
 * Sample color from image at specific point
 */
function sampleColorFromImage(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  sampleSize: number = 5
): string {
  // Sample a small area and average the colors
  const imageData = ctx.getImageData(
    Math.max(0, x - sampleSize),
    Math.max(0, y - sampleSize),
    sampleSize * 2,
    sampleSize * 2
  );
  
  let r = 0, g = 0, b = 0;
  const pixels = imageData.data.length / 4;
  
  for (let i = 0; i < imageData.data.length; i += 4) {
    r += imageData.data[i];
    g += imageData.data[i + 1];
    b += imageData.data[i + 2];
  }
  
  r = Math.round(r / pixels);
  g = Math.round(g / pixels);
  b = Math.round(b / pixels);
  
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Sample gradient colors for smoother blending
 */
function sampleGradientColors(
  ctx: CanvasRenderingContext2D,
  area: { x: number; y: number; width: number; height: number },
  imgWidth: number,
  imgHeight: number
): { top: string; bottom: string } {
  const actualX = (area.x / 100) * imgWidth;
  const actualY = (area.y / 100) * imgHeight;
  const actualHeight = (area.height / 100) * imgHeight;
  
  // Sample from edges (outside the text area)
  const topColor = sampleColorFromImage(ctx, actualX - 10, actualY, 10);
  const bottomColor = sampleColorFromImage(ctx, actualX - 10, actualY + actualHeight, 10);
  
  return { top: topColor, bottom: bottomColor };
}

/**
 * Draw text with word wrapping
 */
function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  textAlign: 'left' | 'center' | 'right'
): void {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  ctx.textAlign = textAlign;
  
  let drawX = x;
  if (textAlign === 'center') drawX = x + maxWidth / 2;
  if (textAlign === 'right') drawX = x + maxWidth;

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line.trim(), drawX, currentY);
      line = words[i] + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  
  ctx.fillText(line.trim(), drawX, currentY);
}

/**
 * Load Google Font dynamically
 */
async function loadFont(fontName: string): Promise<void> {
  const fontUrls: Record<string, string> = {
    'Noto Sans Devanagari': 'https://fonts.gstatic.com/s/notosansdevanagari/v25/TuGOUUFzXI5FBtUq5a8bjKYTZjtRU6Sgv3NaV_SNmI0b8QQ.woff2'
  };
  
  if (fontUrls[fontName]) {
    const font = new FontFace(fontName, `url(${fontUrls[fontName]})`);
    await font.load();
    document.fonts.add(font);
  }
}

/**
 * Apply Hindi text overlay with background color fill
 */
export async function applyHindiOverlay(
  imageBase64: string,
  config: OverlayConfig
): Promise<string> {
  const { regions, defaultBackgroundColor = '#f0f4f8', fontFamily = 'Noto Sans Devanagari' } = config;
  
  // Load Hindi font
  await loadFont(fontFamily);
  
  // Create image
  const img = new Image();
  
  return new Promise((resolve, reject) => {
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      // Draw original image
      ctx.drawImage(img, 0, 0);
      
      // Process each region
      for (const region of regions) {
        // Calculate actual positions
        const actualX = (region.x / 100) * img.width;
        const actualY = (region.y / 100) * img.height;
        const actualWidth = (region.width / 100) * img.width;
        const actualHeight = (region.height / 100) * img.height;
        
        // Scale font size
        const scaleFactor = Math.min(img.width / 1920, img.height / 1080);
        const actualFontSize = Math.round(region.fontSize * scaleFactor);
        
        // Determine background color
        let bgColor = defaultBackgroundColor;
        
        if (region.useBackgroundSample) {
          // Sample from specified point or edge of cover area
          if (region.samplePoint) {
            const sampleX = (region.samplePoint.x / 100) * img.width;
            const sampleY = (region.samplePoint.y / 100) * img.height;
            bgColor = sampleColorFromImage(ctx, sampleX, sampleY, 15);
          } else if (region.coverArea) {
            // Sample from left edge of cover area
            const coverX = (region.coverArea.x / 100) * img.width;
            const coverY = (region.coverArea.y / 100) * img.height;
            bgColor = sampleColorFromImage(ctx, coverX - 20, coverY + 20, 15);
          }
        } else if (region.backgroundColor) {
          bgColor = region.backgroundColor;
        }
        
        // Cover area with background color (covers English text)
        if (region.coverArea) {
          const coverX = (region.coverArea.x / 100) * img.width;
          const coverY = (region.coverArea.y / 100) * img.height;
          const coverWidth = (region.coverArea.width / 100) * img.width;
          const coverHeight = (region.coverArea.height / 100) * img.height;
          
          // Fill with sampled/specified background color
          ctx.fillStyle = bgColor;
          ctx.fillRect(coverX, coverY, coverWidth, coverHeight);
        }
        
        // Draw Hindi text
        ctx.font = `${region.fontWeight} ${actualFontSize}px "${fontFamily}", sans-serif`;
        ctx.fillStyle = region.textColor;
        ctx.textBaseline = 'top';
        
        const lineHeight = actualFontSize * 1.3;
        
        drawWrappedText(
          ctx,
          region.hindiText,
          actualX,
          actualY,
          actualWidth,
          lineHeight,
          region.textAlign
        );
      }
      
      // Return result
      const resultBase64 = canvas.toDataURL('image/png').split(',')[1];
      resolve(resultBase64);
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = `data:image/png;base64,${imageBase64}`;
  });
}

/**
 * Predefined regions for nebZmart horizontal LBL
 * Covers English text and replaces with Hindi
 */
export const NEBZMART_HINDI_REGIONS: TextRegion[] = [
  {
    id: 'claim1',
    hindiText: '5 मिनट में तेज़ असर',
    x: 28,
    y: 72,
    width: 15,
    height: 8,
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    textColor: '#d35400',
    useBackgroundSample: true,
    coverArea: {
      x: 26,
      y: 68,
      width: 18,
      height: 12
    }
  },
  {
    id: 'claim2',
    hindiText: '12 घंटे लंबे समय तक राहत',
    x: 44,
    y: 72,
    width: 15,
    height: 8,
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    textColor: '#d35400',
    useBackgroundSample: true,
    coverArea: {
      x: 42,
      y: 68,
      width: 18,
      height: 12
    }
  },
  {
    id: 'claim3',
    hindiText: 'तीव्रता को 12%-15% तक कम करता है',
    x: 60,
    y: 72,
    width: 18,
    height: 8,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    textColor: '#d35400',
    useBackgroundSample: true,
    coverArea: {
      x: 58,
      y: 68,
      width: 20,
      height: 12
    }
  },
  {
    id: 'claim4',
    hindiText: 'फेफड़ों की क्षमता में 120 ml सुधार',
    x: 78,
    y: 72,
    width: 18,
    height: 8,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    textColor: '#d35400',
    useBackgroundSample: true,
    coverArea: {
      x: 76,
      y: 68,
      width: 20,
      height: 12
    }
  }
];

/**
 * Quick function to apply Hindi overlay to nebZmart LBL
 */
export async function applyNebzmartHindiOverlay(imageBase64: string): Promise<string> {
  return applyHindiOverlay(imageBase64, {
    regions: NEBZMART_HINDI_REGIONS,
    defaultBackgroundColor: '#f5f0e8'  // Cream/beige fallback
  });
}
