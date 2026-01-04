/**
 * Simple Hindi Overlay for NebZmart LBL
 * 
 * Usage:
 * 1. Import this file
 * 2. Call applyNebzmartHindi(yourImageBase64)
 * 3. Get back the Hindi version
 * 
 * This handles:
 * - Sampling background color from image
 * - Covering English text areas
 * - Placing Hindi text with proper fonts
 */

// Hindi translations for nebZmart claims
const HINDI_CLAIMS = {
  claim1: '5 मिनट में तेज़ असर',
  claim2: '12 घंटे लंबे समय तक राहत', 
  claim3: 'तीव्रता को 12%-15% कम करता है',
  claim4: 'फेफड़ों की क्षमता में 120 ml सुधार',
  disclaimer: 'केवल पंजीकृत चिकित्सक या अस्पताल या प्रयोगशाला के उपयोग के लिए'
};

// Regions to cover and replace (percentages of image)
// Adjust these based on your actual LBL layout
const COVER_REGIONS = [
  // LEFT SIDE - Headline/Main claim area (0-27%)
  {
    id: 'headline',
    hindi: 'सांस लेने में आसानी',  // "Breathe Easy" / main headline
    cover: { x: 2, y: 60, width: 24, height: 20 },
    text: { x: 2, y: 65, width: 24 },
    fontSize: 28,
    color: '#2c3e50'  // Dark blue/black
  },
  // MIDDLE CLAIMS (4 boxes)
  {
    id: 'claim1',
    hindi: HINDI_CLAIMS.claim1,
    // Area to cover (English text)
    cover: { x: 27, y: 67, width: 16, height: 14 },
    // Where to place Hindi text
    text: { x: 27, y: 71, width: 16 },
    fontSize: 20,
    color: '#c0392b'  // Dark red/maroon
  },
  {
    id: 'claim2',
    hindi: HINDI_CLAIMS.claim2,
    cover: { x: 44, y: 67, width: 16, height: 14 },
    text: { x: 44, y: 71, width: 16 },
    fontSize: 18,
    color: '#c0392b'
  },
  {
    id: 'claim3',
    hindi: HINDI_CLAIMS.claim3,
    cover: { x: 61, y: 67, width: 18, height: 14 },
    text: { x: 61, y: 71, width: 18 },
    fontSize: 16,
    color: '#c0392b'
  },
  {
    id: 'claim4',
    hindi: HINDI_CLAIMS.claim4,
    cover: { x: 79, y: 67, width: 18, height: 14 },
    text: { x: 79, y: 71, width: 18 },
    fontSize: 16,
    color: '#c0392b'
  },
  // BOTTOM - Disclaimer
  {
    id: 'disclaimer',
    hindi: HINDI_CLAIMS.disclaimer,
    cover: { x: 2, y: 92, width: 96, height: 7 },
    text: { x: 2, y: 93, width: 96 },
    fontSize: 12,
    color: '#555555'  // Gray for disclaimer
  }
];

/**
 * Sample average color from a region of the canvas
 */
function sampleBackgroundColor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number
): string {
  // Sample from left edge (outside the text area)
  const sampleX = Math.max(0, x - 30);
  const sampleY = y + height / 2;
  
  const imageData = ctx.getImageData(sampleX, sampleY, 20, 20);
  
  let r = 0, g = 0, b = 0;
  const count = imageData.data.length / 4;
  
  for (let i = 0; i < imageData.data.length; i += 4) {
    r += imageData.data[i];
    g += imageData.data[i + 1];
    b += imageData.data[i + 2];
  }
  
  r = Math.round(r / count);
  g = Math.round(g / count);
  b = Math.round(b / count);
  
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Load Noto Sans Devanagari font
 */
async function loadHindiFont(): Promise<void> {
  const fontUrl = 'https://fonts.gstatic.com/s/notosansdevanagari/v25/TuGOUUFzXI5FBtUq5a8bjKYTZjtRU6Sgv3NaV_SNmI0b8QQ.woff2';
  
  try {
    const font = new FontFace('Noto Sans Devanagari', `url(${fontUrl})`);
    await font.load();
    document.fonts.add(font);
    console.log('Hindi font loaded');
  } catch (err) {
    console.warn('Could not load Hindi font, using fallback');
  }
}

/**
 * Draw wrapped text
 */
function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  color: string
): void {
  ctx.font = `bold ${fontSize}px "Noto Sans Devanagari", "Mangal", sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  
  const words = text.split(' ');
  let line = '';
  let currentY = y;
  const lineHeight = fontSize * 1.3;
  const centerX = x + maxWidth / 2;

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line.trim(), centerX, currentY);
      line = words[i] + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  
  ctx.fillText(line.trim(), centerX, currentY);
}

/**
 * Main function - Apply Hindi overlay to NebZmart LBL
 */
export async function applyNebzmartHindi(imageBase64: string): Promise<string> {
  // Load font first
  await loadHindiFont();
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Draw original image
      ctx.drawImage(img, 0, 0);
      
      // Process each region
      for (const region of COVER_REGIONS) {
        // Convert percentages to pixels
        const coverX = (region.cover.x / 100) * img.width;
        const coverY = (region.cover.y / 100) * img.height;
        const coverW = (region.cover.width / 100) * img.width;
        const coverH = (region.cover.height / 100) * img.height;
        
        // Sample background color from nearby area
        const bgColor = sampleBackgroundColor(ctx, coverX, coverY, coverW, coverH);
        
        // Cover the English text area with background color
        ctx.fillStyle = bgColor;
        ctx.fillRect(coverX, coverY, coverW, coverH);
        
        // Draw Hindi text
        const textX = (region.text.x / 100) * img.width;
        const textY = (region.text.y / 100) * img.height;
        const textW = (region.text.width / 100) * img.width;
        
        // Scale font size based on image dimensions
        const scaleFactor = Math.min(img.width / 1920, img.height / 1080);
        const fontSize = Math.round(region.fontSize * scaleFactor * 1.5);
        
        drawText(ctx, region.hindi, textX, textY, textW, fontSize, region.color);
      }
      
      // Return as base64
      const resultBase64 = canvas.toDataURL('image/png').split(',')[1];
      resolve(resultBase64);
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = `data:image/png;base64,${imageBase64}`;
  });
}

/**
 * Quick test function
 */
export async function testHindiOverlay(imageBase64: string): Promise<void> {
  console.log('Starting Hindi overlay...');
  
  try {
    const result = await applyNebzmartHindi(imageBase64);
    console.log('Hindi overlay complete!');
    
    // Create download link
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${result}`;
    link.download = 'nebzmart-hindi.png';
    link.click();
    
    console.log('Download triggered');
  } catch (err) {
    console.error('Error:', err);
  }
}

// Export for use
export { HINDI_CLAIMS, COVER_REGIONS };
