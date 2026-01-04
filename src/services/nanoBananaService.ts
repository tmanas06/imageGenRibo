import { GoogleGenAI } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.warn('VITE_GEMINI_API_KEY is not set. Image generation will not work.');
}

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export interface GenerateImageOptions {
  prompt: string;
  company: string;
  brand: string;
  theme: string;
  language: string;
  referenceImages?: string[]; // base64 encoded images (legacy)
  labeledContent?: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>; // New: pre-built labeled content from buildApiContent
  aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9'; // Output aspect ratio
}

// Base pharma context for all themes
const PHARMA_BASE_CONTEXT = `
Role: You are a Senior Medical Copywriter and Regulatory Compliance Expert for a Top 10 Indian Pharmaceutical MNC.

Background Data:
- Onset: 5 mins | Duration: 12 hrs
- Lung Function: +120ml FEV1 improvement
- Exacerbation Reduction: 12% - 15%
- Format: Nebulized Smartules

MANDATORY REGULATORY TEXT (must appear at bottom):
"For the use of a Registered Medical Practitioner, Hospital, or Laboratory only."

BRANDING RULES:
- Generic name must be placed immediately below the brand name
- Generic name font size must be no less than 1/3rd of the brand name size

DESIGN GUIDELINES:
- Color Palette: Clinical Teal, White, and Professional Blue
- Use RED only for "Exacerbation Risk" or negative indicators
- Use GREEN for "Reduction/Improvement" or positive outcomes
- Typography: Clean, sans-serif fonts (Helvetica or Montserrat style) for modern medical look
- Patient must appear HEALTHY and ACTIVE (walking, smiling, breathing freely) - NOT sick

DATA VISUALIZATION:
- All charts must be clearly labeled
- Bar charts showing 12% and 15% must be labeled as "Moderate COPD" and "Severe COPD" respectively
`;

// Theme-specific prompt additions
const THEME_PROMPTS: Record<string, string> = {
  'rapid-sustainable-efficacy': `
${PHARMA_BASE_CONTEXT}

KEY THEME: Rapid & Sustained Efficacy
Supporting Claims: "Quick onset of action within 5 mins" and "12 hrs long lasting relief"
Clinical Significance: Addresses the patient's immediate need for relief while ensuring twice daily (BID) compliance.

DESIGN CONCEPT - SPLIT-SCREEN LAYOUT:
LEFT SIDE ("The Rapid Pulse"):
- High-tech digital stopwatch frozen at 05:00 minutes
- Caption: "Breathe easier, faster"
- Dynamic, energetic feel

RIGHT SIDE ("The Sustained Peace"):
- Calm sunset or clock showing 12 Hours
- Caption: "Reliable control that lasts"
- Serene, peaceful feel

VISUAL METAPHOR: Show transformation from breathlessness to relief
`,
  'exacerbation-control': `
${PHARMA_BASE_CONTEXT}

KEY THEME: Exacerbation Control
Supporting Claims: "Reduces exacerbations by 12%-15%"
Clinical Significance: Critical clinical endpoint for "Group E" (Exacerbators) patients; directly links therapy to disease progression control.

DESIGN CONCEPT:
VISUAL METAPHOR: Use one of these concepts:
- "Protective Shield" around the lungs
- "Lungs under a glass dome" symbolizing protection
- Shield deflecting exacerbation triggers

BAR CHART REQUIREMENT:
- Show comparison bars: 12% (Moderate COPD) vs 15% (Severe COPD)
- Label clearly: "Exacerbation Reduction vs Placebo"
- Use GREEN for reduction bars

TYPOGRAPHY:
- Bold headline: "PROTECT AGAINST EXACERBATIONS"
- Subheadline with the 12-15% claim
`,
};

// Language to ethnicity mapping for patient representation
const LANGUAGE_ETHNICITY: Record<string, string> = {
  'English': 'Modern Indian Urban',
  'Hindi': 'Rural North Indian Village',
  'Tamil': 'Rural South Indian Village',
};

// Detailed ethnicity descriptions for accurate patient generation
function getEthnicityDetails(language: string, ethnicity: string): string {
  const details: Record<string, string> = {
    'Hindi': `NORTH INDIAN VILLAGE CHARACTER:
- Age: 55-70 years old elderly person
- Skin: Brown/wheatish tone typical of rural North India
- Features: Indian facial features, dark eyes, grey/white hair
- Attire: Simple white/cream kurta-pajama OR dhoti
- For women: Simple cotton saree, no heavy jewelry
- Appearance: Weather-worn face, humble, hardworking village look
- Expression: Warm genuine smile, healthy and happy
- Setting: Could be standing, gesturing, welcoming
- Style: Natural, unpolished, rural farmer/villager look
- AVOID: Western clothes, suits, ties, urban styling`,
    'Tamil': `SOUTH INDIAN VILLAGE CHARACTER:
- Age: 55-70 years old elderly person
- Skin: Darker brown tone typical of Tamil Nadu
- Features: South Indian/Dravidian features, dark complexion
- Attire: Simple cotton veshti/dhoti for men
- For women: Simple cotton saree (not silk)
- Appearance: Weather-worn, humble village appearance
- Expression: Warm smile, healthy look
- Style: Traditional rural South Indian
- AVOID: Western clothes, modern urban styling`,
    'English': `MODERN URBAN INDIAN CHARACTER:
- Age: 50-65 years old
- Skin: Fair/wheatish Indian complexion
- Features: Well-groomed, professional appearance
- Attire: Smart casual or semi-formal wear
- Appearance: Clean, polished, educated professional
- Expression: Confident, healthy, active
- Setting: Could be from metro city (Mumbai, Delhi, Bangalore)
- Style: Modern, sophisticated, middle-class professional`,
  };

  return details[language] || details['Hindi'] || `- ${ethnicity} appearance with appropriate skin tone and facial features`;
}

export interface GenerateImageResult {
  imageBase64: string;
  mimeType: string;
}

/**
 * Generate an image using Gemini Image Generation
 */
export async function generateImage(options: GenerateImageOptions): Promise<GenerateImageResult> {
  if (!ai) {
    throw new Error('API key not configured. Please set VITE_GEMINI_API_KEY in your .env file.');
  }

  const { prompt, company, brand, theme, language, referenceImages, labeledContent } = options;

  // Build the full prompt with theme, brand, and language instructions
  let fullPrompt = prompt;

  // Add theme-specific context if not "all"
  if (theme !== 'all' && THEME_PROMPTS[theme]) {
    fullPrompt = `${fullPrompt}\n\n${THEME_PROMPTS[theme]}`;
  }

  // Add company and product context
  if (company) {
    fullPrompt = `Company: ${company.charAt(0).toUpperCase() + company.slice(1)}\n\n${fullPrompt}`;
  }
  if (brand) {
    fullPrompt = `Product: ${brand.charAt(0).toUpperCase() + brand.slice(1)}\n\n${fullPrompt}`;
  }

  // Add patient ethnicity instruction based on language - MUST be at the start for emphasis
  const ethnicity = LANGUAGE_ETHNICITY[language] || 'Indian';
  const ethnicityDetails = getEthnicityDetails(language, ethnicity);

  // Build character instruction based on language/market
  const characterInstruction = `
🚨 CHARACTER/PATIENT REQUIREMENT 🚨

📍 TARGET MARKET: ${language}
📍 REQUIRED CHARACTER TYPE: ${ethnicity}

YOU MUST GENERATE A NEW PATIENT WITH THESE CHARACTERISTICS:
${ethnicityDetails}

⚠️ RULES:
1. DO NOT copy the person from the reference image
2. ONLY use reference image for LAYOUT and DESIGN inspiration
3. Generate a COMPLETELY NEW person matching the description above

${language === 'Hindi' ? '👤 CHARACTER: North Indian VILLAGE person - brown skin, simple kurta/dhoti, rural appearance' : ''}
${language === 'Tamil' ? '👤 CHARACTER: South Indian VILLAGE person - darker brown skin, traditional village attire' : ''}
${language === 'English' ? '👤 CHARACTER: Modern URBAN Indian - fair/wheatish skin, professional city attire' : ''}
`;

  // CRITICAL: Enforce English-only text generation
  const languageInstruction = `
*** CRITICAL: ALL TEXT MUST BE IN ENGLISH ***
*** DO NOT GENERATE ANY HINDI, TAMIL OR DEVANAGARI SCRIPT ***
*** NON-ENGLISH TEXT WILL BE ADDED VIA POST-PROCESSING ***

NEVER generate:
❌ Hindi text (हिंदी) - DO NOT ATTEMPT
❌ Tamil text (தமிழ்) - DO NOT ATTEMPT
❌ Any Devanagari script - DO NOT ATTEMPT
❌ Any non-Latin characters - DO NOT ATTEMPT

ALWAYS generate:
✅ English text ONLY
✅ Clean, readable Latin characters
✅ Standard pharmaceutical English phrases

ALL TEXT ON THE LBL MUST BE IN ENGLISH. This is mandatory.
`;

  // Final reminder - reinforced
  const finalReminder = `

=== CRITICAL FINAL REMINDER ===
🚨 ALL TEXT: ENGLISH ONLY - NO EXCEPTIONS
🚨 DO NOT generate Hindi/Tamil/Devanagari - it WILL fail
🚨 Non-English text will be added separately via post-processing
✅ CHARACTER: ${ethnicity} - generate NEW person matching the target market
✅ DESIGN: Fresh new design while keeping brand identity

Generate ALL text in clean, readable ENGLISH only.
=== END ===
`;

  fullPrompt = `
${characterInstruction}

${languageInstruction}

${fullPrompt}

${finalReminder}`;

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

  try {
    const response = await ai.models.generateContent({
      // model: 'imagen-3.0-generate-002', // Using available model with image generation
      model: 'gemini-2.5-flash-image',
      contents: contents,
      config: {
        responseModalities: ['image', 'text'],
        // Request 16:9 aspect ratio for presentation slide format
        imageConfig: {
          aspectRatio: '16:9',
        },
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
        const imageBase64 = part.inlineData.data as string;

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
