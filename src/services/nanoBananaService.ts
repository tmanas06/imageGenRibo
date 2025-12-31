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
    'Hindi': `⛔ COMPLETELY IGNORE THE PERSON IN THE REFERENCE IMAGE - DO NOT COPY THEM ⛔

GENERATE A COMPLETELY NEW PERSON WITH THESE CHARACTERISTICS:
- Brown/wheatish skin tone typical of rural North India
- Indian facial features (oval face, dark eyes, dark hair)
- MUST look like a VILLAGE person - a FARMER or RURAL WORKER
- Simple, humble, POOR rural appearance
- MUST wear traditional Indian VILLAGE attire:
  * For men: Simple white/cream kurta-pajama, dhoti, or lungi
  * For women: Simple cotton saree (not silk/fancy), no heavy jewelry
- Weather-worn face, sun-tanned skin, hardworking appearance
- Natural, unpolished look - NO fancy styling or grooming
- Could have wrinkles, rough hands, simple appearance
- Think: Indian village farmer, agricultural worker, rural laborer
- AVOID: Western clothes, modern styling, urban sophistication, formal wear, suits, ties

🚫 DO NOT: Copy the person from the PDF/reference image
✅ DO: Generate a NEW rural North Indian villager`,
    'Tamil': `- Darker brown skin tone typical of rural Tamil Nadu villages
- South Indian facial features (broader nose, dark complexion)
- Dark black hair, dark brown/black eyes
- MUST look like a VILLAGE person from Tamil Nadu, NOT city/urban
- Simple, humble, rural South Indian appearance
- Traditional village attire (simple cotton veshti/dhoti for men, cotton saree for women)
- Weather-worn, hardworking appearance typical of South Indian villages
- Natural, unpolished look
- Distinctly South Indian/Dravidian village appearance
- AVOID: Western clothes, modern styling, urban sophistication`,
    'English': `- Fair/wheatish skin tone (Indian fair complexion)
- Modern, urban Indian appearance
- MUST look like a CITY person - educated, professional
- Modern Indian urban attire (smart casuals, formal wear)
- Well-groomed, polished appearance
- Could be from metro cities like Mumbai, Delhi, Bangalore
- Sophisticated, educated professional look
- Clean, modern styling
- Urban Indian middle-class or upper-middle-class appearance`,
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

  const { prompt, company, brand, theme, language, referenceImages } = options;

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

  // Build language-specific instruction
  const brandName = brand.charAt(0).toUpperCase() + brand.slice(1);
  let languageInstruction = '';

  if (language === 'Hindi') {
    languageInstruction = `
🚨🚨🚨 CRITICAL - MANDATORY HINDI LANGUAGE REQUIREMENT 🚨🚨🚨

⚠️⚠️⚠️ OUTPUT LANGUAGE: HINDI (हिन्दी) - DEVANAGARI SCRIPT ONLY ⚠️⚠️⚠️

THIS IS THE #1 PRIORITY INSTRUCTION. EVERY SINGLE TEXT ELEMENT MUST BE IN HINDI.

CURRENT PRODUCT: ${brandName}

📝 MANDATORY TRANSLATIONS - USE THESE EXACT HINDI WORDS:

| English | Hindi (USE THIS) |
|---------|------------------|
| Fast Relief | तेज़ राहत |
| Quick Action | त्वरित कार्रवाई |
| Long Lasting | लंबे समय तक |
| Breathe Easy | आसानी से सांस लें |
| Protection | सुरक्षा |
| Control | नियंत्रण |
| Minutes | मिनट |
| Hours | घंटे |
| Relief | राहत |
| Improvement | सुधार |
| Effective | प्रभावी |
| Treatment | उपचार |
| Patient | रोगी |
| Doctor | चिकित्सक |
| 5 minutes | 5 मिनट |
| 12 hours | 12 घंटे |
| Fast acting | तेज़ असर |
| Long lasting relief | लंबे समय तक राहत |
| Reduces exacerbations | तीव्रता को कम करता है |
| For the use of Registered Medical Practitioner | पंजीकृत चिकित्सक के उपयोग के लिए |
| Hospital | अस्पताल |
| Laboratory | प्रयोगशाला |

✅ KEEP IN ENGLISH (DO NOT TRANSLATE):
- Product/Brand name: "${brandName}" (keep exactly as is)
- Generic drug names (chemical names)
- Numbers and percentages (5, 12, 15%)
- Company name

❌ FORBIDDEN - DO NOT DO THIS:
- Writing headlines in English
- Writing claims in English
- Writing any descriptive text in English
- Using Roman/Latin script for Hindi words

🔴 EVERY HEADLINE, EVERY CLAIM, EVERY DESCRIPTION = HINDI SCRIPT (देवनागरी) 🔴
`;
  } else if (language === 'Tamil') {
    languageInstruction = `
🚨🚨🚨 CRITICAL - MANDATORY TAMIL LANGUAGE REQUIREMENT 🚨🚨🚨

⚠️⚠️⚠️ OUTPUT LANGUAGE: TAMIL (தமிழ்) - TAMIL SCRIPT ONLY ⚠️⚠️⚠️

THIS IS THE #1 PRIORITY INSTRUCTION. EVERY SINGLE TEXT ELEMENT MUST BE IN TAMIL.

CURRENT PRODUCT: ${brandName}

📝 MANDATORY TRANSLATIONS - USE THESE EXACT TAMIL WORDS:

| English | Tamil (USE THIS) |
|---------|------------------|
| Fast Relief | விரைவான நிவாரணம் |
| Quick Action | விரைவான செயல் |
| Long Lasting | நீண்ட நேரம் |
| Breathe Easy | எளிதாக சுவாசிக்கவும் |
| Protection | பாதுகாப்பு |
| Control | கட்டுப்பாடு |
| Minutes | நிமிடங்கள் |
| Hours | மணி நேரம் |
| Relief | நிவாரணம் |
| Improvement | முன்னேற்றம் |
| Effective | பயனுள்ள |
| Treatment | சிகிச்சை |
| Patient | நோயாளி |
| Doctor | மருத்துவர் |
| 5 minutes | 5 நிமிடங்கள் |
| 12 hours | 12 மணி நேரம் |
| Fast acting | வேகமாக செயல்படும் |
| Long lasting relief | நீண்ட நேர நிவாரணம் |
| Reduces exacerbations | தீவிரத்தை குறைக்கிறது |
| For the use of Registered Medical Practitioner | பதிவு செய்யப்பட்ட மருத்துவரின் பயன்பாட்டிற்கு மட்டும் |
| Hospital | மருத்துவமனை |
| Laboratory | ஆய்வகம் |

✅ KEEP IN ENGLISH (DO NOT TRANSLATE):
- Product/Brand name: "${brandName}" (keep exactly as is)
- Generic drug names (chemical names)
- Numbers and percentages (5, 12, 15%)
- Company name

❌ FORBIDDEN - DO NOT DO THIS:
- Writing headlines in English
- Writing claims in English
- Writing any descriptive text in English
- Using Roman/Latin script for Tamil words

🔴 EVERY HEADLINE, EVERY CLAIM, EVERY DESCRIPTION = TAMIL SCRIPT (தமிழ்) 🔴
`;
  }

  // Build character instruction based on language - THIS OVERRIDES ANY OTHER CHARACTER INSTRUCTIONS
  const characterInstruction = `
🚨🚨🚨 CRITICAL CHARACTER/PATIENT OVERRIDE - READ THIS FIRST 🚨🚨🚨

⛔⛔⛔ IGNORE ANY OTHER CHARACTER INSTRUCTIONS IN THIS PROMPT ⛔⛔⛔

The instructions below about "CHARACTER/PATIENT IMAGE" or "analyze the character in source" are OVERRIDDEN.

📍 TARGET MARKET: ${language}
📍 REQUIRED CHARACTER TYPE: ${ethnicity}

🔴 YOU MUST GENERATE A PATIENT WITH THESE EXACT CHARACTERISTICS:
${ethnicityDetails}

⚠️ CRITICAL RULES FOR CHARACTER:
1. DO NOT copy or match the person from the reference image
2. DO NOT use the reference image person's ethnicity, skin tone, or appearance
3. ONLY use reference image for LAYOUT and DESIGN inspiration
4. The patient MUST match the "${ethnicity}" description above
5. Generate a COMPLETELY NEW person based on the description above

${language === 'Hindi' ? '👤 CHARACTER MUST BE: North Indian VILLAGE FARMER - brown skin, simple kurta/dhoti, rural poor appearance. ⛔ DO NOT USE THE PERSON FROM PDF!' : ''}
${language === 'Tamil' ? '👤 CHARACTER MUST BE: South Indian VILLAGE person with darker brown skin, traditional village attire' : ''}
${language === 'English' ? '👤 CHARACTER MUST BE: Modern URBAN Indian with fair/wheatish skin, professional city attire' : ''}

🔴 THIS CHARACTER REQUIREMENT IS NON-NEGOTIABLE AND OVERRIDES ALL OTHER INSTRUCTIONS 🔴
`;

  // Final reminder at the end - extra strong for Hindi
  const finalReminder = language === 'Hindi' ? `

=== 🚨 FINAL REMINDER FOR HINDI - MUST FOLLOW 🚨 ===
⛔ DO NOT USE THE PERSON FROM THE REFERENCE PDF/IMAGE ⛔
✅ CHARACTER: Generate a NEW North Indian VILLAGE FARMER
   - Brown/wheatish skin, simple kurta/dhoti/saree
   - Rural, poor, hardworking village appearance
   - NOT the person shown in the reference image
✅ LANGUAGE: ALL TEXT IN HINDI (देवनागरी script)
✅ The person in the PDF is just for LAYOUT reference - DO NOT copy their face/appearance
=== END REMINDER ===
` : `

=== FINAL REMINDER - MUST FOLLOW ===
✅ CHARACTER: ${ethnicity} (${language === 'Tamil' ? 'Village South Indian' : 'Urban City Indian'})
✅ LANGUAGE: ${language === 'Tamil' ? 'TAMIL (தமிழ் script)' : 'ENGLISH'}
✅ DO NOT copy person from reference image - generate NEW person matching above description
=== END REMINDER ===
`;

  fullPrompt = `
${characterInstruction}

${languageInstruction}

${fullPrompt}

${finalReminder}`;

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
