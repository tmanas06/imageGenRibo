import * as pdfjsLib from 'pdfjs-dist';

// Set worker source - use unpkg for reliable CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

/**
 * Convert a PDF file to an array of base64 images (one per page)
 */
export async function convertPdfToImages(file: File): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const images: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const scale = 2.0; // Higher scale for better quality
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    await page.render(renderContext as any).promise;

    // Convert to base64 (without data URL prefix)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const base64 = dataUrl.split(',')[1];
    images.push(base64);
  }

  return images;
}

/**
 * Convert an image file to base64
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix if present
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Extract text from PDF to find brand/product name
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + ' ';
  }

  return fullText;
}

/**
 * Extract brand/product name from PDF text
 */
export function extractBrandName(text: string): string | null {
  // Known pharma brand patterns - commonly end with specific suffixes
  const brandPatterns = [
    /\b([A-Z][a-z]+(?:cept|mart|zole|pril|sartan|statin|mab|nib|tide|pine|pam|lam|done|one|ine|ate|ide)(?:-[A-Z])?)\b/gi,
    /\b(Alphacept|Nebzmart|Ajaduo|Formoterol|Glycopyrronium)\b/gi,
  ];

  for (const pattern of brandPatterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      // Return the first match, cleaned up
      return matches[0].trim();
    }
  }

  // Try to find capitalized product names (often at the start or prominently displayed)
  const capitalizedPattern = /\b([A-Z][a-z]+(?:-[A-Z])?)\s*(?:®|™|\(R\)|\(TM\))?/g;
  const capitalMatches = text.match(capitalizedPattern);
  if (capitalMatches && capitalMatches.length > 0) {
    // Filter out common words
    const commonWords = ['The', 'For', 'Use', 'Only', 'With', 'And', 'From', 'This', 'That', 'Medical', 'Practitioner', 'Hospital', 'Laboratory'];
    const filtered = capitalMatches.filter(m => !commonWords.includes(m.trim()));
    if (filtered.length > 0) {
      return filtered[0].trim();
    }
  }

  return null;
}

export interface ProcessFileResult {
  images: string[];
  brandName: string | null;
}

/**
 * Process uploaded file - handles both PDF and images
 */
export async function processFile(file: File): Promise<ProcessFileResult> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  if (isPdf) {
    const images = await convertPdfToImages(file);
    const text = await extractTextFromPdf(file);
    const brandName = extractBrandName(text);
    return { images, brandName };
  } else {
    const base64 = await fileToBase64(file);
    // For images, we can't extract text, so brandName is null
    return { images: [base64], brandName: null };
  }
}

/**
 * Get MIME type from file
 */
export function getMimeType(file: File): string {
  if (file.type) return file.type;

  const ext = file.name.toLowerCase().split('.').pop();
  const mimeTypes: Record<string, string> = {
    'pdf': 'application/pdf',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'webp': 'image/webp',
    'gif': 'image/gif',
  };

  return mimeTypes[ext || ''] || 'application/octet-stream';
}
