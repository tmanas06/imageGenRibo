/**
 * Content Extractor Service
 *
 * Step 1: Extract text content from component images using Gemini Vision
 * This populates the prompt with actual extracted text from the visual components
 */

import { GoogleGenAI } from "@google/genai";
import type { ComponentData, ComponentId } from './componentService';
import { COMPONENT_METADATA } from './componentService';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Component extraction prompts based on SOMA 53 spec
const EXTRACTION_PROMPTS: Partial<Record<ComponentId, string>> = {
  'INIT_01a': 'Extract ONLY the primary brand name (root name without variants, suffixes like XL/ER/Plus, or trademark symbols). Return just the brand name text.',
  'INIT_01b': 'Extract the variant suffix if present (like M, G, CV, XL, ER, Plus). If no variant, return "Standard".',
  'INIT_03': 'Extract the main headline or marketing message. This is typically large text below the brand name.',
  'INIT_06': 'Extract the tagline or slogan - a short memorable marketing phrase.',
  'INIT_09': 'Extract any heritage or legacy statement (like "Trusted for X years").',
  'INS_01': 'Extract the target patient profile description.',
  'INS_02': 'Extract disease overview information.',
  'INS_03': 'Extract risk factors information.',
  'INS_04': 'Extract the indication statement - the approved therapeutic use (often starts with "In patients with..." or "For the treatment of...").',
  'SOL_01': 'Extract USP claims and marketing messages about product benefits. List each claim separately.',
  'SOL_02': 'Extract the generic name and composition with strengths (e.g., "Silodosin 8mg + Mirabegron 25mg").',
  'SOL_04': 'Extract the mechanism of action text explanation.',
  'SOL_05': 'Extract formulation technology information (Extended Release, Controlled Release, etc.).',
  'SOL_06': 'Extract route of administration and dosage form (oral tablets, injection, etc.).',
  'SOL_07': 'Extract any mnemonic or memory aid.',
  'EVID_01': 'Extract efficacy claims with data and reference citations (include percentages, p-values).',
  'EVID_03': 'Extract clinical study summary (study name, design, patient count, results).',
  'EVID_05': 'Extract clinical guideline recommendations.',
  'EVID_07': 'Extract expert quotes or testimonials with attribution.',
  'EVID_08': 'Extract case study information.',
  'SAFE_01': 'Extract dosage information (recommended dose, frequency, duration).',
  'SAFE_02': 'Extract available strengths and forms.',
  'SAFE_03': 'Extract safety claims (well tolerated, safe profile statements).',
  'SAFE_04': 'Extract side effects and adverse events list.',
  'SAFE_05': 'Extract contraindications.',
  'SERV_01': 'Extract digital service name only (e.g., "LUPIN\'S ANYA").',
  'SERV_04': 'Extract service tagline or description.',
  'COMM_01': 'Extract price or MRP information.',
  'COMM_03': 'Extract company name.',
  'COMM_05': 'Extract division name.',
  'REG_01': 'Extract abbreviated prescribing information text.',
  'REG_02': 'Extract references list. Format each reference separately.',
  'REG_05': 'Extract the RMP disclaimer text exactly as shown.',
  'REG_06': 'Extract batch or lot reference information.',
  'REG_07': 'Extract document approval code.',
  'REG_08': 'Extract manufacturing address.',
  'REG_09': 'Extract abbreviations list with their full forms.',
};

// Image components that don't need text extraction
const IMAGE_ONLY_COMPONENTS: ComponentId[] = [
  'INIT_02', 'INIT_04', 'INIT_05', 'INIT_07', 'INIT_08',
  'SOL_03', 'EVID_02', 'EVID_04', 'EVID_06', 'EVID_09', 'EVID_10',
  'SERV_02', 'SERV_03', 'COMM_02', 'COMM_04', 'REG_04'
];

export interface ExtractionResult {
  componentId: ComponentId;
  content: string | null;
  confidence: 'high' | 'medium' | 'low';
  error?: string;
}

/**
 * Extract text content from a single component image using Gemini Vision
 */
export async function extractContentFromImage(
  imageBase64: string,
  componentId: ComponentId
): Promise<ExtractionResult> {
  if (!ai) {
    return {
      componentId,
      content: null,
      confidence: 'low',
      error: 'API not configured'
    };
  }

  // Skip image-only components
  if (IMAGE_ONLY_COMPONENTS.includes(componentId)) {
    return {
      componentId,
      content: null,
      confidence: 'high' // Not an error, just no text expected
    };
  }

  const extractionPrompt = EXTRACTION_PROMPTS[componentId];
  if (!extractionPrompt) {
    return {
      componentId,
      content: null,
      confidence: 'low',
      error: 'No extraction prompt defined for this component'
    };
  }

  const meta = COMPONENT_METADATA[componentId];

  const prompt = `You are extracting pharmaceutical content from a visual aid component.

Component: ${componentId} - ${meta.name}
Type: ${meta.type}
Criticality: ${meta.criticality}

TASK: ${extractionPrompt}

RULES:
- Extract ONLY the relevant text for this component type
- Preserve exact wording, numbers, and references
- Include superscript reference numbers (¹, ², ³) if present
- Return plain text, no markdown formatting
- If the component type content is not visible, return "NOT_FOUND"
- Be precise and concise

Return ONLY the extracted text, nothing else.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        { text: prompt },
        {
          inlineData: {
            mimeType: 'image/png',
            data: imageBase64
          }
        }
      ]
    });

    const text = response.candidates?.[0]?.content?.parts?.[0];
    if (text && 'text' in text && text.text) {
      const extractedText = text.text.trim();

      if (extractedText === 'NOT_FOUND' || extractedText.length < 2) {
        return {
          componentId,
          content: null,
          confidence: 'low'
        };
      }

      return {
        componentId,
        content: extractedText,
        confidence: extractedText.length > 10 ? 'high' : 'medium'
      };
    }

    return {
      componentId,
      content: null,
      confidence: 'low',
      error: 'No text in response'
    };
  } catch (error) {
    return {
      componentId,
      content: null,
      confidence: 'low',
      error: error instanceof Error ? error.message : 'Extraction failed'
    };
  }
}

/**
 * Extract content from all components that have images
 * Returns components with populated content fields
 * Uses sequential processing with delays to avoid rate limits
 */
export async function extractAllContent(
  components: ComponentData[],
  onProgress?: (done: number, total: number, current: ComponentId) => void
): Promise<ComponentData[]> {
  // Only process text-type components that need extraction
  const textComponents = components.filter(c =>
    c.image_base64 &&
    !IMAGE_ONLY_COMPONENTS.includes(c.component_id) &&
    EXTRACTION_PROMPTS[c.component_id]
  );

  const total = textComponents.length;
  let done = 0;

  console.log(`[ContentExtractor] Starting extraction for ${total} text components (skipping ${components.length - total} image-only components)`);

  const results: ComponentData[] = [...components];

  // Process ONE component at a time with delays to avoid rate limits
  for (const comp of textComponents) {
    onProgress?.(done, total, comp.component_id);

    console.log(`[ContentExtractor] Processing ${comp.component_id} (${done + 1}/${total})...`);

    // Try extraction with retry logic
    let result: ExtractionResult | null = null;
    let retries = 3;
    let delay = 3000; // Start with 3 second delay on retry

    while (retries > 0) {
      result = await extractContentFromImage(comp.image_base64!, comp.component_id);

      // Check if rate limited
      if (result.error?.includes('429') || result.error?.includes('rate') || result.error?.includes('Too Many')) {
        retries--;
        if (retries > 0) {
          console.log(`[ContentExtractor] Rate limited on ${comp.component_id}, waiting ${delay}ms before retry (${retries} retries left)...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff: 3s -> 6s -> 12s
        }
      } else {
        break; // Success or other error, stop retrying
      }
    }

    // Update result if we got content
    if (result?.content) {
      const idx = results.findIndex(c => c.id === comp.id);
      if (idx !== -1) {
        results[idx] = { ...results[idx], content: result.content };
        console.log(`[ContentExtractor] ✓ Extracted: ${comp.component_id} = "${result.content.substring(0, 50)}..."`);
      }
    } else if (result?.error) {
      console.warn(`[ContentExtractor] ✗ Failed: ${comp.component_id} - ${result.error}`);
    }

    done++;

    // Wait 2 seconds between EACH request to avoid rate limits
    if (done < total) {
      console.log(`[ContentExtractor] Waiting 2s before next request...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  onProgress?.(done, total, textComponents[textComponents.length - 1]?.component_id || 'DONE');
  console.log(`[ContentExtractor] Extraction complete: ${done}/${total} components processed`);

  return results;
}

/**
 * Get extraction summary for debugging
 */
export function getExtractionSummary(components: ComponentData[]): {
  total: number;
  withContent: number;
  withImages: number;
  byType: Record<string, { hasContent: boolean; hasImage: boolean }[]>;
} {
  const byType: Record<string, { hasContent: boolean; hasImage: boolean }[]> = {};

  for (const comp of components) {
    if (!byType[comp.component_id]) {
      byType[comp.component_id] = [];
    }
    byType[comp.component_id].push({
      hasContent: !!comp.content,
      hasImage: !!(comp.image_base64 || comp.image_path)
    });
  }

  return {
    total: components.length,
    withContent: components.filter(c => c.content).length,
    withImages: components.filter(c => c.image_base64 || c.image_path).length,
    byType
  };
}
