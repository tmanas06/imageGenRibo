import type { ComponentData, ComponentId } from '../services/componentService';
import { COMPONENT_METADATA, groupComponentsBySection } from '../services/componentService';

/**
 * Build AI prompt from fetched components
 * This replaces the old FIXED_PROMPT with dynamic content from Supabase
 */
export function buildPromptFromComponents(components: ComponentData[], language: string = 'English'): string {
  const grouped = groupComponentsBySection(components);

  // Helper to get component content
  const getContent = (id: ComponentId): string | null => {
    const comp = components.find(c => c.component_id === id);
    return comp?.content || null;
  };

  // Helper to check if component has image
  const hasImage = (id: ComponentId): boolean => {
    const comp = components.find(c => c.component_id === id);
    return !!(comp?.image_path || comp?.image_base64);
  };

  // Extract key data from components
  const brandName = getContent('INIT_01a') || 'Unknown Brand';
  const brandVariant = getContent('INIT_01b') || '';
  const headline = getContent('INIT_03') || '';
  const tagline = getContent('INIT_06') || '';
  const indication = getContent('INS_04') || '';
  const genericName = getContent('SOL_02') || '';
  const claims = getContent('SOL_01') || '';
  const efficacyClaims = getContent('EVID_01') || '';
  const dosage = getContent('SAFE_01') || '';
  const disclaimer = getContent('REG_05') || 'For the use of a Registered Medical Practitioner, Hospital, or Laboratory only';
  const companyName = getContent('COMM_03') || '';

  // Build the prompt
  const prompt = `You are a Pharmaceutical Marketing Director, Medical Affairs Lead, Regulatory Compliance Officer, and Senior Visual Designer.

TASK: Generate a high-fidelity, print-ready pharmaceutical Leave Behind Leaflet (LBL) that EXACTLY MATCHES the design template and styling from the reference component images.

OUTPUT SPECIFICATIONS:
- Resolution: 2560x1440 pixels (LANDSCAPE orientation - wider than tall)
- Aspect Ratio: 16:9 (horizontal/landscape)
- Crystal clear, print-ready quality


CRITICAL INSTRUCTION - LANGUAGE:
Generate ALL text in ENGLISH only. Do NOT generate Hindi, Tamil, or any non-Latin script.


═══════════════════════════════════════════════════════════════════════════════
CRITICAL: COPY DESIGN FROM REFERENCE IMAGES
═══════════════════════════════════════════════════════════════════════════════

You are provided with reference component images. You MUST:

1. COPY THE EXACT COLOR SCHEME from the reference images
   - Use the SAME text colors (headlines, body text, claims)
   - Use the SAME background colors and gradients
   - Use the SAME accent colors for icons and highlights
   - Match the color of the disclaimer bar exactly

2. COPY THE EXACT DESIGN TEMPLATE
   - Use the SAME layout structure as shown in references
   - Use the SAME icon styles and shapes
   - Use the SAME typography style and font weights
   - Use the SAME spacing and proportions
   - Match the visual hierarchy exactly

3. COPY LOGOS AND BRAND ELEMENTS EXACTLY
   - Company logo: Copy EXACTLY as shown - same colors, same design
   - Brand logo: Copy EXACTLY as shown - same typography, same colors
   - Campaign logos: Copy EXACTLY if present
   - Do NOT modify, recolor, or redesign any logos

4. USE TEXT FROM REFERENCE IMAGES
   - Read and extract the exact text/claims from the component images
   - Use the SAME wording as shown in the references
   - Maintain the SAME text styling (bold, colors, sizes)

═══════════════════════════════════════════════════════════════════════════════


BRAND IDENTITY (from components):

BRAND NAME: ${brandName}${brandVariant ? ` ${brandVariant}` : ''}
${headline ? `HEADLINE: ${headline}` : ''}
${tagline ? `TAGLINE: ${tagline}` : ''}
${companyName ? `COMPANY: ${companyName}` : ''}

GENERIC NAME/COMPOSITION:
${genericName || 'Extract from reference images'}


INDICATION:
${indication || 'Extract from reference images'}


KEY CLAIMS (USP):
${claims || efficacyClaims || 'Extract claims from the reference component images - use EXACT text and styling shown'}


DOSAGE INFORMATION:
${dosage || 'Extract from reference images'}


REGULATORY DISCLAIMER:
${disclaimer}


LAYOUT REQUIREMENTS:

ORIENTATION: LANDSCAPE (wider than tall)

LOGO POSITIONS:
- Company logo (pharma company like Glenmark): TOP-LEFT corner
- Brand/Product logo (product name like nebZmart): TOP-RIGHT corner

CONTENT LAYOUT:
- Patient/Character image: LEFT side
- Headlines and claims: RIGHT side
- Disclaimer: BOTTOM, full width

SPACING:
- No overlapping elements
- Follow the layout from reference images


CHARACTER REQUIREMENTS:
${getCharacterPrompt(language)}


DESIGN GUIDELINES:

COLORS - COPY FROM REFERENCES:
- Use the EXACT color palette from the reference images
- Match text colors precisely (headlines, body, claims)
- Match background colors and gradients
- Match icon and accent colors
- Do NOT use generic colors - extract from references

TYPOGRAPHY - MATCH REFERENCES:
- Use the SAME font style as references
- Match font weights (bold headlines, regular body)
- Match text sizes and hierarchy
- All text must be PERFECTLY LEGIBLE
- Correct spelling for: Registered, Practitioner, Hospital, Laboratory, Exacerbations

QUALITY:
- High resolution, sharp and clear
- No blur, pixelation, or artifacts
- Print-ready professional quality


FORBIDDEN ACTIONS:
- Do NOT generate Hindi, Tamil, or non-English text
- Do NOT produce garbled or misspelled text
- Do NOT create overlapping elements
- Do NOT copy person from reference images (generate new person)
- Do NOT create blurry output
- Do NOT change the color scheme from references
- Do NOT redesign logos or brand elements
- Do NOT use generic colors - always match references


OUTPUT:
Generate ONLY the final image matching the reference design. No explanations or commentary.`;

  return prompt;
}

/**
 * Get character/patient prompt based on language/market
 */
function getCharacterPrompt(language: string): string {
  switch (language) {
    case 'Hindi':
      return `Generate a NEW PERSON with these characteristics:
- NORTH INDIAN VILLAGE CHARACTER
- Age: 55-70 years old
- Skin: Brown/wheatish tone typical of rural North India
- Attire: Simple white/cream kurta-pajama OR dhoti
- Appearance: Weather-worn face, humble, hardworking village look
- Expression: Warm genuine smile, healthy and happy
- AVOID: Western clothes, suits, ties, urban styling`;

    case 'Tamil':
      return `Generate a NEW PERSON with these characteristics:
- SOUTH INDIAN VILLAGE CHARACTER
- Age: 55-70 years old
- Skin: Darker brown tone typical of Tamil Nadu
- Features: South Indian/Dravidian features
- Attire: Simple cotton veshti/dhoti
- Appearance: Weather-worn, humble village appearance
- Expression: Warm smile, healthy look
- AVOID: Western clothes, modern urban styling`;

    default: // English
      return `Generate a NEW PERSON with these characteristics:
- MODERN URBAN INDIAN CHARACTER
- Age: 50-65 years old
- Skin: Fair/wheatish Indian complexion
- Attire: Smart casual or semi-formal wear
- Appearance: Clean, polished, educated professional
- Expression: Confident, healthy, active
- Setting: Metro city professional`;
  }
}

/**
 * Get image components that should be passed as reference
 */
export function getImageComponents(components: ComponentData[]): { id: ComponentId; base64: string; description: string }[] {
  const imageComponents: { id: ComponentId; base64: string; description: string }[] = [];

  for (const comp of components) {
    if (comp.image_base64) {
      const meta = COMPONENT_METADATA[comp.component_id];
      imageComponents.push({
        id: comp.component_id,
        base64: comp.image_base64,
        description: `${meta.name} - ${comp.content || 'Reference image'}`
      });
    }
  }

  return imageComponents;
}

/**
 * Build a summary of available components for display
 */
export function getComponentSummary(components: ComponentData[]): {
  total: number;
  bySection: Record<string, number>;
  mandatory: { present: number; total: number };
  hasImages: number;
} {
  const grouped = groupComponentsBySection(components);

  const bySection: Record<string, number> = {};
  for (const [section, comps] of Object.entries(grouped)) {
    bySection[section] = comps.length;
  }

  const mandatoryIds = Object.entries(COMPONENT_METADATA)
    .filter(([_, meta]) => meta.criticality === 'MANDATORY')
    .map(([id]) => id);

  const presentMandatory = components.filter(c =>
    mandatoryIds.includes(c.component_id)
  ).length;

  const hasImages = components.filter(c => c.image_base64 || c.image_path).length;

  return {
    total: components.length,
    bySection,
    mandatory: { present: presentMandatory, total: mandatoryIds.length },
    hasImages
  };
}
