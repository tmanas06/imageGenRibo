import { GoogleGenAI } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.warn('VITE_GEMINI_API_KEY is not set. Image generation will not work.');
}

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export interface GenerateImageOptions {
  prompt: string;
  language: string;
  referenceImages?: string[]; // base64 encoded images
}

export interface GenerateImageResult {
  imageBase64: string;
  mimeType: string;
}

/**
 * Generate an image using Nano Banana Pro (Gemini 3 Pro Image)
 */
export async function generateImage(options: GenerateImageOptions): Promise<GenerateImageResult> {
  if (!ai) {
    throw new Error('API key not configured. Please set VITE_GEMINI_API_KEY in your .env file.');
  }

  const { prompt, language, referenceImages } = options;

  // Build the full prompt with language instruction
  const fullPrompt = language !== 'English'
    ? `Generate an image. If there is any text in the image, render it in ${language}. ${prompt}`
    : prompt;

  // Build content parts
  const contents: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: fullPrompt }
  ];

  // Add reference images if provided
  if (referenceImages && referenceImages.length > 0) {
    for (const img of referenceImages) {
      contents.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: img
        }
      });
    }
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', // Using available model with image generation
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
        return {
          imageBase64: part.inlineData.data,
          mimeType: part.inlineData.mimeType || 'image/png'
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
