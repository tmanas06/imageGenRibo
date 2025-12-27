import { GoogleGenAI } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.warn('VITE_GEMINI_API_KEY is not set. Image generation will not work.');
}

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export interface GenerateImageOptions {
  prompt: string;
  language: string;
  brand: string;
  theme: string;
  referenceImages?: string[]; // base64 encoded images
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
  'rapid-sustained-efficacy': `
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
  'English': 'Western/Caucasian',
  'Hindi': 'Indian',
  'Tamil': 'South Indian',
};

// Detailed ethnicity descriptions for accurate patient generation
function getEthnicityDetails(language: string, ethnicity: string): string {
  const details: Record<string, string> = {
    'Hindi': `- Brown/wheatish skin tone typical of North India
- Indian facial features (oval face, dark eyes, dark hair)
- Could wear traditional or modern Indian attire
- Typical North Indian appearance`,
    'Tamil': `- Darker brown skin tone typical of Tamil Nadu
- South Indian facial features (broader nose, dark complexion)
- Dark black hair, dark brown/black eyes
- Distinctly South Indian/Dravidian appearance`,
    'Telugu': `- Medium to dark brown skin tone typical of Andhra/Telangana
- South Indian facial features
- Dark hair, dark eyes
- Telugu/South Indian appearance`,
    'Kannada': `- Medium brown skin tone typical of Karnataka
- South Indian facial features
- Dark hair, dark eyes
- Kannadiga appearance`,
    'Malayalam': `- Dark brown skin tone typical of Kerala
- South Indian/Malayali facial features
- Dark hair, dark eyes
- Kerala/Malayali appearance`,
    'Bengali': `- Fair to medium brown skin typical of Bengal
- Bengali facial features (slightly elongated face)
- Dark hair, dark eyes
- East Indian/Bengali appearance`,
    'English': `- Fair/light skin tone
- Western/Caucasian facial features
- Could have various hair colors (brown, blonde)
- European/Western appearance`,
    'Chinese': `- Light/fair East Asian skin tone
- Chinese facial features (monolid eyes, straight black hair)
- East Asian appearance`,
    'Japanese': `- Fair East Asian skin tone
- Japanese facial features
- Straight black hair
- Japanese appearance`,
    'Russian': `- Very fair/pale skin tone
- Slavic facial features
- Could have light hair (blonde, light brown) and light eyes
- Russian/Slavic appearance`,
    'Arabic': `- Olive to light brown skin tone
- Middle Eastern facial features
- Dark hair, dark eyes
- Arab/Middle Eastern appearance`,
    'Spanish': `- Olive to tan skin tone
- Hispanic/Latino facial features
- Dark hair, dark eyes
- Latin American appearance`,
  };

  return details[language] || details['Hindi'] || `- ${ethnicity} appearance with appropriate skin tone and facial features`;
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

  const { prompt, language, brand, theme, referenceImages } = options;

  // Build the full prompt with theme, brand, and language instructions
  let fullPrompt = prompt;

  // Add theme-specific context if not "all"
  if (theme !== 'all' && THEME_PROMPTS[theme]) {
    fullPrompt = `${fullPrompt}\n\n${THEME_PROMPTS[theme]}`;
  }

  // Add brand context
  if (brand) {
    fullPrompt = `Brand: ${brand.charAt(0).toUpperCase() + brand.slice(1)}\n\n${fullPrompt}`;
  }

  // Add patient ethnicity instruction based on language - MUST be at the start for emphasis
  const ethnicity = LANGUAGE_ETHNICITY[language] || 'Indian';
  const ethnicityDetails = getEthnicityDetails(language, ethnicity);

  // Build language-specific instruction
  let languageInstruction = '';
  if (language === 'Hindi') {
    languageInstruction = `
🚨🚨🚨 HIGHEST PRIORITY - MANDATORY LANGUAGE REQUIREMENT 🚨🚨🚨

YOU MUST WRITE ALL TEXT IN HINDI LANGUAGE USING DEVANAGARI SCRIPT (हिन्दी).

❌ DO NOT USE ENGLISH FOR:
- "Fast Relief" → USE "तेज़ राहत"
- "Quick Action" → USE "त्वरित कार्रवाई"
- "Long Lasting" → USE "लंबे समय तक"
- "Breathe Easy" → USE "आसानी से सांस लें"
- "Protection" → USE "सुरक्षा"
- "Control" → USE "नियंत्रण"
- "Minutes" → USE "मिनट"
- "Hours" → USE "घंटे"
- "Relief" → USE "राहत"
- "Improvement" → USE "सुधार"

✅ ONLY KEEP IN ENGLISH:
- Brand name (e.g., "Nebzmart-G")
- Generic drug name (e.g., "Glycopyrronium")
- Numbers (e.g., "5", "12", "15%")

TRANSLATE THESE COMMON PHRASES:
- "5 minutes" → "5 मिनट"
- "12 hours" → "12 घंटे"
- "Fast acting" → "तेज़ असर"
- "Long lasting relief" → "लंबे समय तक राहत"
- "Reduces exacerbations" → "तीव्रता को कम करता है"
- "For the use of Registered Medical Practitioner" → "पंजीकृत चिकित्सक के उपयोग के लिए"

🚨 THIS IS NON-NEGOTIABLE - ALL VISIBLE TEXT MUST BE IN HINDI SCRIPT 🚨
`;
  } else if (language === 'Tamil') {
    languageInstruction = `
🚨🚨🚨 HIGHEST PRIORITY - MANDATORY LANGUAGE REQUIREMENT 🚨🚨🚨

YOU MUST WRITE ALL TEXT IN TAMIL LANGUAGE USING TAMIL SCRIPT (தமிழ்).

❌ DO NOT USE ENGLISH FOR:
- "Fast Relief" → USE "விரைவான நிவாரணம்"
- "Quick Action" → USE "விரைவான செயல்"
- "Long Lasting" → USE "நீண்ட நேரம்"
- "Breathe Easy" → USE "எளிதாக சுவாசிக்கவும்"
- "Protection" → USE "பாதுகாப்பு"
- "Control" → USE "கட்டுப்பாடு"
- "Minutes" → USE "நிமிடங்கள்"
- "Hours" → USE "மணி நேரம்"
- "Relief" → USE "நிவாரணம்"

✅ ONLY KEEP IN ENGLISH:
- Brand name (e.g., "Nebzmart-G")
- Generic drug name (e.g., "Glycopyrronium")
- Numbers (e.g., "5", "12", "15%")

TRANSLATE THESE COMMON PHRASES:
- "5 minutes" → "5 நிமிடங்கள்"
- "12 hours" → "12 மணி நேரம்"
- "Fast acting" → "வேகமாக செயல்படும்"
- "Long lasting relief" → "நீண்ட நேர நிவாரணம்"

🚨 THIS IS NON-NEGOTIABLE - ALL VISIBLE TEXT MUST BE IN TAMIL SCRIPT 🚨
`;
  }

  fullPrompt = `
${languageInstruction}

=== MANDATORY PATIENT APPEARANCE REQUIREMENT ===
Target Market: ${language}
Required Ethnicity: ${ethnicity}

You MUST generate a NEW patient with these EXACT characteristics:
${ethnicityDetails}

⚠️ IMPORTANT: If a reference image is provided, DO NOT copy the person from it.
Only use the reference for layout/design inspiration. Generate a COMPLETELY NEW person
matching the ${ethnicity} ethnicity described above.

=== END MANDATORY REQUIREMENT ===

${fullPrompt}`;

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
        return {
          imageBase64: part.inlineData.data as string,
          mimeType: (part.inlineData.mimeType || 'image/png') as string
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
