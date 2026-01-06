/**
 * Reference Image Service
 *
 * Step 2: Load and manage reference images for AI generation
 * These are design reference images that guide the AI's visual style
 */

// Reference images are stored in /reference folder
// They are loaded at build time via Vite's import.meta.glob

// Import reference images
import reference1 from '../../reference/reference1.png';
import reference2 from '../../reference/reference2.png';
import reference3 from '../../reference/reference3.png';
import reference4 from '../../reference/reference4.jpeg';

export interface ReferenceImage {
  id: string;
  name: string;
  path: string;
  base64?: string;
  description: string;
}

// Static reference images with descriptions
export const REFERENCE_IMAGES: ReferenceImage[] = [
  {
    id: 'ref1',
    name: 'Reference 1',
    path: reference1,
    description: 'Professional pharmaceutical LBL design reference - layout and typography'
  },
  {
    id: 'ref2',
    name: 'Reference 2',
    path: reference2,
    description: 'Professional pharmaceutical LBL design reference - visual hierarchy'
  },
  {
    id: 'ref3',
    name: 'Reference 3',
    path: reference3,
    description: 'Professional pharmaceutical LBL design reference - color and branding'
  },
  {
    id: 'ref4',
    name: 'Reference 4',
    path: reference4,
    description: 'Professional pharmaceutical LBL design reference - information density'
  }
];

/**
 * Load a single image as base64
 */
async function loadImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove data URL prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Load all reference images as base64
 */
export async function loadReferenceImages(): Promise<ReferenceImage[]> {
  const loaded: ReferenceImage[] = [];

  for (const ref of REFERENCE_IMAGES) {
    try {
      const base64 = await loadImageAsBase64(ref.path);
      loaded.push({
        ...ref,
        base64
      });
    } catch (error) {
      console.warn(`Failed to load reference image ${ref.name}:`, error);
    }
  }

  return loaded;
}

/**
 * Get reference images for API content
 * Returns format ready for Gemini API
 */
export async function getReferenceImagesForApi(): Promise<
  Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>
> {
  const references = await loadReferenceImages();
  const content: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

  if (references.length === 0) {
    return content;
  }

  content.push({
    text: `[DESIGN_REFERENCE_IMAGES] - These are professional pharmaceutical LBL designs.
Use them to understand:
- Visual hierarchy and layout patterns
- Typography and information density
- Professional pharmaceutical aesthetic
- Color usage and branding integration

DO NOT copy these exactly. Use them as STYLE GUIDANCE only.`
  });

  for (const ref of references) {
    if (ref.base64) {
      // Add description
      content.push({
        text: `Reference: ${ref.description}`
      });
      // Add image
      content.push({
        inlineData: {
          mimeType: ref.path.endsWith('.jpeg') ? 'image/jpeg' : 'image/png',
          data: ref.base64
        }
      });
    }
  }

  return content;
}

/**
 * Check if reference images are available
 */
export function hasReferenceImages(): boolean {
  return REFERENCE_IMAGES.length > 0;
}
