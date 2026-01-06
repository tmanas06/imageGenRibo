import { GoogleGenAI } from "@google/genai";
import { getReferenceImagesForApi } from './referenceImageService';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.warn('VITE_GEMINI_API_KEY is not set. Image generation will not work.');
}

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export interface GenerateImageOptions {
  prompt: string;
  company: string;
  brand: string;
  referenceImages?: string[]; // base64 encoded images (legacy)
  labeledContent?: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>; // New: pre-built labeled content from buildApiContent
  includeDesignReferences?: boolean; // Whether to include reference folder images
  aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9'; // Output aspect ratio
}

export interface GenerateImageResult {
  imageBase64: string;
  mimeType: string;
}

/**
 * Fit image to target aspect ratio (no cropping - adds background padding if needed)
 */
async function fitImageToAspectRatio(
  imageBase64: string,
  targetAspectRatio: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      // Parse target aspect ratio
      const [targetW, targetH] = targetAspectRatio.split(':').map(Number);
      const targetRatio = targetW / targetH;
      const currentRatio = img.width / img.height;

      // Target canvas size (use larger dimension as base)
      let canvasWidth: number, canvasHeight: number;

      if (currentRatio > targetRatio) {
        // Image is wider - fit width, add height padding
        canvasWidth = img.width;
        canvasHeight = Math.round(img.width / targetRatio);
      } else {
        // Image is taller - fit height, add width padding
        canvasHeight = img.height;
        canvasWidth = Math.round(img.height * targetRatio);
      }

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Fill with white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Center the image on canvas
      const offsetX = Math.round((canvasWidth - img.width) / 2);
      const offsetY = Math.round((canvasHeight - img.height) / 2);

      // Draw original image centered
      ctx.drawImage(img, offsetX, offsetY);

      // Return as base64
      const resultBase64 = canvas.toDataURL('image/png').split(',')[1];
      resolve(resultBase64);
    };

    img.onerror = () => reject(new Error('Failed to load image for resizing'));
    img.src = `data:image/png;base64,${imageBase64}`;
  });
}

/**
 * Generate an image using Nano Banana Pro (Gemini 3 Pro Image)
 */
export async function generateImage(options: GenerateImageOptions): Promise<GenerateImageResult> {
  if (!ai) {
    throw new Error('API key not configured. Please set VITE_GEMINI_API_KEY in your .env file.');
  }

  const { prompt, company, brand, referenceImages, labeledContent, includeDesignReferences = true, aspectRatio = '3:4' } = options;

  // Build the full prompt with brand context
  let fullPrompt = prompt;

  // Add company and product context
  if (company) {
    fullPrompt = `Company: ${company.charAt(0).toUpperCase() + company.slice(1)}\n\n${fullPrompt}`;
  }
  if (brand) {
    fullPrompt = `Product: ${brand.charAt(0).toUpperCase() + brand.slice(1)}\n\n${fullPrompt}`;
  }

  // CRITICAL: Enforce English-only text generation
  const textInstruction = `
*** CRITICAL: ALL TEXT MUST BE IN ENGLISH ***

ALWAYS generate:
✅ English text ONLY
✅ Clean, readable Latin characters
✅ Standard pharmaceutical English phrases

ALL TEXT ON THE LBL MUST BE IN ENGLISH. This is mandatory.
`;

  fullPrompt = `
${textInstruction}

${fullPrompt}
`;

  // Build content parts
  let contents: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>;

  if (labeledContent && labeledContent.length > 0) {
    // Use pre-built labeled content (new approach with proper logo/reference separation)
    // Replace the first text element (prompt) with our enhanced prompt
    contents = [{ text: fullPrompt }];
    // Add the rest of the labeled content (logo images and design references with labels)
    for (let i = 1; i < labeledContent.length; i++) {
      contents.push(labeledContent[i]);
    }
  } else if (referenceImages && referenceImages.length > 0) {
    // Legacy approach - add reference images without labels
    contents = [{ text: fullPrompt }];
    contents.push({ text: '[DESIGN_REFERENCES] - Use these for color palette and style:' });
    for (const img of referenceImages) {
      contents.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: img
        }
      });
    }
  } else {
    // No images provided
    contents = [{ text: fullPrompt }];
  }

  // Add design reference images from /reference folder
  if (includeDesignReferences) {
    try {
      const designReferences = await getReferenceImagesForApi();
      if (designReferences.length > 0) {
        contents.push(...designReferences);
      }
    } catch (refError) {
      console.warn('Failed to load design references:', refError);
    }
  }

  try {
    const response = await ai.models.generateContent({
      // model: 'imagen-3.0-generate-002', // Using available model with image generation
      model: 'gemini-2.5-flash-image',
      contents: contents,
      config: {
        responseModalities: ['image', 'text'],
      }
    });

    // Extract the generated image from response
    const candidate = response.candidates?.[0];
    if (!candidate?.content?.parts) {
      throw new Error('No content in response');
    }

    // Find the image part in the response
    for (const part of candidate.content.parts) {
      if ('inlineData' in part && part.inlineData) {
        let imageBase64 = part.inlineData.data as string;

        // Fit to target aspect ratio (no cropping - adds padding)
        try {
          imageBase64 = await fitImageToAspectRatio(imageBase64, aspectRatio);
        } catch (resizeErr) {
          console.warn('Failed to fit image, using original:', resizeErr);
        }

        return {
          imageBase64,
          mimeType: 'image/png'
        };
      }
    }

    // If no image found, check for text response (might be an error message)
    for (const part of candidate.content.parts) {
      if ('text' in part && part.text) {
        throw new Error(`Model returned text instead of image: ${part.text}`);
      }
    }

    throw new Error('No image generated in response');
  } catch (error) {
    if (error instanceof Error) {
      // Handle specific API errors
      if (error.message.includes('429')) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      }
      if (error.message.includes('403')) {
        throw new Error('API access denied. Please check your API key permissions.');
      }
      throw error;
    }
    throw new Error('Unknown error occurred during image generation');
  }
}

/**
 * Check if the API is properly configured
 */
export function isApiConfigured(): boolean {
  return !!apiKey && !!ai;
}
