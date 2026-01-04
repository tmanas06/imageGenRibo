/**
 * Server-side Text Overlay Service
 * Uses Sharp with SVG for Hindi/Tamil text rendering (no canvas required)
 */

import sharp from 'sharp';

export interface TextRegion {
  id: string;
  englishText: string;
  translatedText?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  textAlign: 'left' | 'center' | 'right';
  color: string;
  backgroundColor?: string;
  backgroundPadding?: number;
  lineHeight?: number;
  maxLines?: number;
}

export interface OverlayConfig {
  language: 'Hindi' | 'Tamil' | 'English';
  regions: TextRegion[];
  outputFormat?: 'png' | 'jpeg';
  quality?: number;
}

// Translation maps
const TRANSLATIONS: Record<string, Record<string, string>> = {
  Hindi: {
    'Quick onset of action within 5 mins': '5 मिनट में तेज़ असर',
    'Action within 5 mins': '5 मिनट में असर',
    '5 mins': '5 मिनट',
    '12 hrs long lasting relief': '12 घंटे लंबे समय तक राहत',
    'Long lasting relief': 'लंबे समय तक राहत',
    '12 hrs': '12 घंटे',
    'Reduces exacerbations by 12%-15%': 'तीव्रता को 12%-15% तक कम करता है',
    'Reduces exacerbations': 'तीव्रता को कम करता है',
    '12%-15%': '12%-15%',
    'Improves lung function by 120 ml': 'फेफड़ों की क्षमता में 120 ml सुधार',
    'Improves lung function': 'फेफड़ों की क्षमता में सुधार',
    '120 ml': '120 ml',
    'For the use of a Registered Medical Practitioner or a Hospital or a Laboratory only':
      'केवल पंजीकृत चिकित्सक या अस्पताल या प्रयोगशाला के उपयोग के लिए',
    'COPD patients highly symptomatic and requiring high dose of ICS':
      'अत्यधिक लक्षण वाले सीओपीडी रोगी जिन्हें ICS की उच्च खुराक की आवश्यकता है',
    'Quick onset of action': 'तेज़ असर की शुरुआत',
    'action within': 'में असर',
    'long lasting': 'लंबे समय तक',
    'relief': 'राहत',
  },
  Tamil: {
    'Quick onset of action within 5 mins': '5 நிமிடங்களில் விரைவான செயல்',
    'Action within 5 mins': '5 நிமிடங்களில் செயல்',
    '5 mins': '5 நிமிடங்கள்',
    '12 hrs long lasting relief': '12 மணி நேரம் நீடித்த நிவாரணம்',
    'Long lasting relief': 'நீடித்த நிவாரணம்',
    '12 hrs': '12 மணி நேரம்',
    'Reduces exacerbations by 12%-15%': 'தீவிரத்தை 12%-15% குறைக்கிறது',
    'Reduces exacerbations': 'தீவிரத்தை குறைக்கிறது',
    'Improves lung function by 120 ml': 'நுரையீரல் செயல்பாட்டை 120 ml மேம்படுத்துகிறது',
    'Improves lung function': 'நுரையீரல் செயல்பாட்டை மேம்படுத்துகிறது',
    'For the use of a Registered Medical Practitioner or a Hospital or a Laboratory only':
      'பதிவு செய்யப்பட்ட மருத்துவர் அல்லது மருத்துவமனை அல்லது ஆய்வகத்தின் பயன்பாட்டிற்கு மட்டும்',
    'COPD patients highly symptomatic and requiring high dose of ICS':
      'அதிக அறிகுறிகள் கொண்ட மற்றும் அதிக ICS தேவைப்படும் சிஓபிடி நோயாளிகள்',
  },
  English: {}
};

function translate(text: string, language: string): string {
  if (language === 'English') return text;

  const langTranslations = TRANSLATIONS[language] || {};

  if (langTranslations[text]) {
    return langTranslations[text];
  }

  for (const [eng, trans] of Object.entries(langTranslations)) {
    if (eng.toLowerCase() === text.toLowerCase()) {
      return trans;
    }
  }

  return text;
}

function getFontFamily(language: string): string {
  switch (language) {
    case 'Hindi':
      return 'Noto Sans Devanagari, Mangal, Arial Unicode MS, sans-serif';
    case 'Tamil':
      return 'Noto Sans Tamil, Latha, Arial Unicode MS, sans-serif';
    default:
      return 'Arial, sans-serif';
  }
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getTextAnchor(align: 'left' | 'center' | 'right'): string {
  switch (align) {
    case 'center': return 'middle';
    case 'right': return 'end';
    default: return 'start';
  }
}

function createTextSvg(
  text: string,
  region: TextRegion,
  imgWidth: number,
  imgHeight: number,
  fontFamily: string
): string {
  const actualX = (region.x / 100) * imgWidth;
  const actualY = (region.y / 100) * imgHeight;
  const actualWidth = (region.width / 100) * imgWidth;

  const scaleFactor = Math.min(imgWidth / 1920, imgHeight / 1080);
  const actualFontSize = Math.round(region.fontSize * scaleFactor);
  const lineHeight = actualFontSize * (region.lineHeight || 1.4);

  let textX = actualX;
  if (region.textAlign === 'center') textX = actualX + actualWidth / 2;
  if (region.textAlign === 'right') textX = actualX + actualWidth;

  const textAnchor = getTextAnchor(region.textAlign);
  const fontWeight = region.fontWeight === 'bold' ? 'bold' : 'normal';

  // Simple word wrapping
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  const avgCharWidth = actualFontSize * 0.5;
  const maxCharsPerLine = Math.floor(actualWidth / avgCharWidth);

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length > maxCharsPerLine && currentLine) {
      lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine = currentLine ? currentLine + ' ' + word : word;
    }
  }
  if (currentLine) lines.push(currentLine.trim());

  // Apply maxLines limit
  if (region.maxLines && lines.length > region.maxLines) {
    lines.length = region.maxLines;
    lines[lines.length - 1] = lines[lines.length - 1] + '...';
  }

  // Generate tspan elements for each line
  const tspans = lines.map((line, i) =>
    `<tspan x="${textX}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`
  ).join('');

  // Background rect if specified
  let bgRect = '';
  if (region.backgroundColor) {
    const padding = region.backgroundPadding || 5;
    const bgHeight = lines.length * lineHeight + padding * 2;
    bgRect = `<rect x="${actualX - padding}" y="${actualY - padding}" width="${actualWidth + padding * 2}" height="${bgHeight}" fill="${region.backgroundColor}"/>`;
  }

  return `
    ${bgRect}
    <text
      x="${textX}"
      y="${actualY + actualFontSize}"
      font-family="${fontFamily}"
      font-size="${actualFontSize}px"
      font-weight="${fontWeight}"
      fill="${region.color}"
      text-anchor="${textAnchor}"
    >${tspans}</text>
  `;
}

export async function applyTextOverlay(
  imageBuffer: Buffer,
  config: OverlayConfig
): Promise<Buffer> {
  const { language, regions, outputFormat = 'png', quality = 90 } = config;

  const metadata = await sharp(imageBuffer).metadata();
  const imgWidth = metadata.width || 1920;
  const imgHeight = metadata.height || 1080;

  const fontFamily = getFontFamily(language);

  // Build SVG with all text regions
  const textElements = regions.map(region => {
    const text = region.translatedText || translate(region.englishText, language);
    return createTextSvg(text, region, imgWidth, imgHeight, fontFamily);
  }).join('');

  const svgOverlay = `
    <svg width="${imgWidth}" height="${imgHeight}" xmlns="http://www.w3.org/2000/svg">
      ${textElements}
    </svg>
  `;

  // Composite SVG text over image
  let result = sharp(imageBuffer)
    .composite([{
      input: Buffer.from(svgOverlay),
      top: 0,
      left: 0
    }]);

  if (outputFormat === 'jpeg') {
    return result.jpeg({ quality }).toBuffer();
  }

  return result.png().toBuffer();
}

export async function applyTextOverlayBase64(
  imageBase64: string,
  config: OverlayConfig
): Promise<string> {
  const imageBuffer = Buffer.from(imageBase64, 'base64');
  const resultBuffer = await applyTextOverlay(imageBuffer, config);
  return resultBuffer.toString('base64');
}

// No-op for compatibility - fonts are loaded from system
export function registerFonts(_fontsDir?: string): void {
  console.log('Using system fonts for text rendering (Noto Sans Devanagari/Tamil)');
  console.log('For best results, install Noto Sans fonts on your system');
}

// Predefined LBL layouts - background covers English, Hindi stacked on top
export const LBL_LAYOUTS: Record<string, TextRegion[]> = {
  'nebzmart-horizontal': [
    // Main headline - cream/beige background to match LBL header area
    {
      id: 'headline',
      englishText: 'COPD patients highly symptomatic and requiring high dose of ICS',
      x: 3,
      y: 7,
      width: 94,
      height: 6,
      fontSize: 26,
      fontWeight: 'bold',
      textAlign: 'center',
      color: '#c84c28',
      backgroundColor: '#f7f3ed',
      backgroundPadding: 12
    },
    // Claim 1 - matches the white teardrop/badge area
    {
      id: 'claim1',
      englishText: 'Quick onset of action within 5 mins',
      x: 25,
      y: 70,
      width: 13,
      height: 15,
      fontSize: 13,
      fontWeight: 'bold',
      textAlign: 'center',
      color: '#1a365d',
      backgroundColor: '#fefefe',
      backgroundPadding: 6,
      maxLines: 4,
      lineHeight: 1.3
    },
    // Claim 2 - 12 hrs relief
    {
      id: 'claim2',
      englishText: '12 hrs long lasting relief',
      x: 39,
      y: 70,
      width: 13,
      height: 15,
      fontSize: 13,
      fontWeight: 'bold',
      textAlign: 'center',
      color: '#1a365d',
      backgroundColor: '#fefefe',
      backgroundPadding: 6,
      maxLines: 4,
      lineHeight: 1.3
    },
    // Claim 3 - Reduces exacerbations
    {
      id: 'claim3',
      englishText: 'Reduces exacerbations by 12%-15%',
      x: 53,
      y: 70,
      width: 15,
      height: 15,
      fontSize: 13,
      fontWeight: 'bold',
      textAlign: 'center',
      color: '#1a365d',
      backgroundColor: '#fefefe',
      backgroundPadding: 6,
      maxLines: 4,
      lineHeight: 1.3
    },
    // Claim 4 - Improves lung function
    {
      id: 'claim4',
      englishText: 'Improves lung function by 120 ml',
      x: 69,
      y: 70,
      width: 15,
      height: 15,
      fontSize: 13,
      fontWeight: 'bold',
      textAlign: 'center',
      color: '#1a365d',
      backgroundColor: '#fefefe',
      backgroundPadding: 6,
      maxLines: 4,
      lineHeight: 1.3
    },
    // Disclaimer at bottom - tan/gray footer background
    {
      id: 'disclaimer',
      englishText: 'For the use of a Registered Medical Practitioner or a Hospital or a Laboratory only',
      x: 12,
      y: 93,
      width: 76,
      height: 5,
      fontSize: 12,
      fontWeight: 'normal',
      textAlign: 'center',
      color: '#2d2d2d',
      backgroundColor: '#e8e4dc',
      backgroundPadding: 8
    }
  ],

  'alphacept-horizontal': [
    {
      id: 'headline',
      englishText: 'COPD patients highly symptomatic and requiring high dose of ICS',
      x: 3,
      y: 7,
      width: 94,
      height: 6,
      fontSize: 26,
      fontWeight: 'bold',
      textAlign: 'center',
      color: '#c84c28',
      backgroundColor: '#f7f3ed',
      backgroundPadding: 12
    },
    {
      id: 'disclaimer',
      englishText: 'For the use of a Registered Medical Practitioner or a Hospital or a Laboratory only',
      x: 12,
      y: 93,
      width: 76,
      height: 5,
      fontSize: 12,
      fontWeight: 'normal',
      textAlign: 'center',
      color: '#2d2d2d',
      backgroundColor: '#e8e4dc',
      backgroundPadding: 8
    }
  ],

  // Generic layout for other products
  'generic-horizontal': [
    {
      id: 'headline',
      englishText: 'COPD patients highly symptomatic and requiring high dose of ICS',
      x: 3,
      y: 7,
      width: 94,
      height: 6,
      fontSize: 24,
      fontWeight: 'bold',
      textAlign: 'center',
      color: '#1a365d',
      backgroundColor: '#f5f5f5',
      backgroundPadding: 10
    },
    {
      id: 'disclaimer',
      englishText: 'For the use of a Registered Medical Practitioner or a Hospital or a Laboratory only',
      x: 10,
      y: 93,
      width: 80,
      height: 5,
      fontSize: 11,
      fontWeight: 'normal',
      textAlign: 'center',
      color: '#333333',
      backgroundColor: '#eeeeee',
      backgroundPadding: 8
    }
  ]
};
