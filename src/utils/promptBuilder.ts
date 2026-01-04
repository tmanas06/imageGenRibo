import type { ComponentData, ComponentId } from '../services/componentService';
import { COMPONENT_METADATA, groupComponentsBySection } from '../services/componentService';

// Page types for multi-page LBL
export type LBLPageType = 'main' | 'efficacy' | 'safety' | 'references';

export interface LBLPageConfig {
  type: LBLPageType;
  title: string;
  description: string;
}

export const LBL_PAGES: LBLPageConfig[] = [
  { type: 'main', title: 'Main LBL', description: 'Brand, key claims, and patient visual' },
  { type: 'efficacy', title: 'Efficacy Data', description: 'Clinical evidence, charts, and study results' },
  { type: 'safety', title: 'Safety & Dosage', description: 'Dosage information, safety profile, contraindications' },
];

// Logo component IDs - these are treated as assets to INSERT, not references
const LOGO_COMPONENT_IDS: { id: ComponentId; label: string; position: string }[] = [
  { id: 'COMM_04', label: 'COMPANY_LOGO', position: 'TOP-LEFT' },
  { id: 'INIT_02', label: 'BRAND_LOGO', position: 'TOP-RIGHT' },
];

/**
 * Build AI prompt from fetched components
 * This replaces the old FIXED_PROMPT with dynamic content from Supabase
 */
export function buildPromptFromComponents(
  components: ComponentData[],
  language: string = 'English',
  pageType: LBLPageType = 'main'
): string {
  // Get page-specific prompt
  switch (pageType) {
    case 'efficacy':
      return buildEfficacyPagePrompt(components, language);
    case 'safety':
      return buildSafetyPagePrompt(components, language);
    default:
      return buildMainPagePrompt(components, language);
  }
}

/**
 * Build prompt for the main LBL page
 */
function buildMainPagePrompt(components: ComponentData[], language: string): string {
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

  // Check which logo images are available
  const hasCompanyLogo = hasImage('COMM_04');
  const hasBrandLogo = hasImage('INIT_02');

  // Build the prompt
  const prompt = `You are a Pharmaceutical Marketing Director, Medical Affairs Lead, Regulatory Compliance Officer, and Senior Visual Designer.

TASK: Generate a print-ready pharmaceutical Leave Behind Leaflet (LBL).

OUTPUT: 2560x1440 pixels, LANDSCAPE orientation (16:9), print-ready quality.

LANGUAGE: Generate ALL text in ENGLISH only. No Hindi, Tamil, or non-Latin scripts.


═══════════════════════════════════════════════════════════════════════════════
SECTION 1: LOGO IMAGES - INSERT EXACTLY AS PROVIDED
═══════════════════════════════════════════════════════════════════════════════

You are provided with specific logo images labeled below. These are NOT references to copy from - these ARE the actual logos. INSERT them exactly as provided.

${hasCompanyLogo ? `[COMPANY_LOGO] IMAGE PROVIDED:
- This image IS the company logo
- INSERT this exact image in the TOP-LEFT corner
- Do NOT redraw, recreate, or modify
- Do NOT generate a new logo - USE THIS IMAGE` : ''}

${hasBrandLogo ? `[BRAND_LOGO] IMAGE PROVIDED:
- This image IS the brand/product logo
- INSERT this exact image in the TOP-RIGHT corner
- Do NOT redraw, recreate, or modify
- Do NOT generate a new logo - USE THIS IMAGE` : ''}

CRITICAL LOGO RULE:
The logo images provided are FINAL ASSETS, not references.
You must INSERT them into the output, not recreate them.
If you generate your own version of any logo, the output is INVALID.


═══════════════════════════════════════════════════════════════════════════════
SECTION 2: BRAND INFORMATION
═══════════════════════════════════════════════════════════════════════════════

BRAND NAME: ${brandName}${brandVariant ? ` ${brandVariant}` : ''}
GENERIC NAME: ${genericName || '[Extract from brand logo image]'}
${headline ? `HEADLINE: ${headline}` : ''}
${tagline ? `TAGLINE: ${tagline}` : ''}
${companyName ? `COMPANY: ${companyName}` : ''}


═══════════════════════════════════════════════════════════════════════════════
SECTION 3: CONTENT
═══════════════════════════════════════════════════════════════════════════════

INDICATION:
${indication || '[Use indication from reference images]'}

KEY CLAIMS:
${claims || efficacyClaims || '[Extract claims from reference images]'}

DOSAGE:
${dosage || '[Extract from reference images]'}

DISCLAIMER:
${disclaimer}


═══════════════════════════════════════════════════════════════════════════════
SECTION 4: CHARACTER - GENERATE NEW
═══════════════════════════════════════════════════════════════════════════════

${getCharacterPrompt(language)}

IMPORTANT: Generate a COMPLETELY NEW person. Do NOT copy any person from reference images.


═══════════════════════════════════════════════════════════════════════════════
SECTION 5: DESIGN REFERENCES
═══════════════════════════════════════════════════════════════════════════════

Other component images provided (labeled [DESIGN_REFERENCE]) are for style guidance. Use them for:
- Color palette (extract exact colors)
- Typography style (match font weights and hierarchy)
- Icon styles (match the visual style)
- Layout structure (follow the arrangement)
- Visual theme (match the overall aesthetic)


═══════════════════════════════════════════════════════════════════════════════
SECTION 6: LAYOUT
═══════════════════════════════════════════════════════════════════════════════

ORIENTATION: LANDSCAPE (wider than tall, 16:9)

POSITIONS:
- Company logo: TOP-LEFT corner
- Brand logo: TOP-RIGHT corner
- Character: LEFT side (30%)
- Claims/Content: RIGHT side (70%)
- Disclaimer: BOTTOM full-width

SPACING: No overlapping elements. Clear separation between all components.


═══════════════════════════════════════════════════════════════════════════════
SECTION 7: QUALITY
═══════════════════════════════════════════════════════════════════════════════

- All logos SHARP and IDENTICAL to provided images
- All text LEGIBLE and correctly spelled
- Spelling check: Registered, Practitioner, Hospital, Laboratory, Exacerbations
- No blur, pixelation, or artifacts
- Print-ready professional quality


═══════════════════════════════════════════════════════════════════════════════
SECTION 8: FORBIDDEN
═══════════════════════════════════════════════════════════════════════════════

- Do NOT generate new logos - use provided logo images exactly
- Do NOT modify or recolor provided logos
- Do NOT generate Hindi/Tamil/non-English text
- Do NOT copy person from references
- Do NOT create overlapping elements
- Do NOT produce garbled or misspelled text


OUTPUT: Final LBL image only. No explanations.`;

  return prompt;
}

/**
 * Get character/patient prompt based on language/market
 */
function getCharacterPrompt(language: string): string {
  switch (language) {
    case 'Hindi':
      return `Generate a NEW PERSON:
- North Indian village character, 55-70 years old
- Brown/wheatish skin, weather-worn face
- Simple white/cream kurta-pajama or dhoti
- Warm genuine smile, healthy appearance
- AVOID: Western clothes, urban styling`;

    case 'Tamil':
      return `Generate a NEW PERSON:
- South Indian village character, 55-70 years old
- Darker brown skin, Dravidian features
- Simple cotton veshti/dhoti
- Warm smile, humble village appearance
- AVOID: Western clothes, modern styling`;

    default:
      return `Generate a NEW PERSON:
- Modern urban Indian professional, 50-65 years old
- Fair/wheatish complexion, well-groomed
- Smart casual or semi-formal attire
- Confident, healthy, professional appearance
- AVOID: Rural attire, traditional village clothing`;
  }
}

/**
 * Build prompt for the efficacy/evidence page
 */
function buildEfficacyPagePrompt(components: ComponentData[], _language: string): string {
  const getContent = (id: ComponentId): string | null => {
    const comp = components.find(c => c.component_id === id);
    return comp?.content || null;
  };

  const brandName = getContent('INIT_01a') || 'Product';
  const efficacyClaims = getContent('EVID_01') || '';
  const studySummary = getContent('EVID_03') || '';
  const guidelineText = getContent('EVID_05') || '';
  const companyName = getContent('COMM_03') || '';

  return `You are a Pharmaceutical Marketing Director creating an EFFICACY DATA page for a Leave Behind Leaflet.

TASK: Generate Page 2 - EFFICACY & CLINICAL EVIDENCE page for ${brandName}

OUTPUT: Landscape orientation (16:9), high resolution, print-ready quality.

LOGO IMAGES: Logo images are provided separately labeled [COMPANY_LOGO] and [BRAND_LOGO].
INSERT these exact images - do NOT recreate them.

PAGE CONTENT - EFFICACY DATA:

BRAND NAME: ${brandName}
COMPANY: ${companyName}

EFFICACY CLAIMS:
${efficacyClaims || 'Show clinical efficacy data with charts and statistics'}

STUDY SUMMARY:
${studySummary || 'Include key clinical study results'}

GUIDELINE RECOMMENDATIONS:
${guidelineText || 'Reference relevant treatment guidelines'}

LAYOUT FOR THIS PAGE:
- Company logo: TOP-LEFT corner (use provided [COMPANY_LOGO] image)
- Brand logo: TOP-RIGHT corner (use provided [BRAND_LOGO] image)
- Page title: "CLINICAL EFFICACY" or "EVIDENCE" prominently displayed
- Charts/Graphs: Show efficacy data visually (bar charts, line graphs)
- Key statistics highlighted in colored boxes
- Study references at bottom
- Disclaimer bar at BOTTOM

DESIGN ELEMENTS TO INCLUDE:
- Bar charts showing efficacy percentages
- Before/After comparisons if applicable
- Statistical significance indicators (p-values)
- Icons representing improvements (lungs, breathing, etc.)

COLORS: Match the reference images color scheme
TEXT: ALL in ENGLISH only
QUALITY: Sharp, clear, print-ready

Generate ONLY the final image. No explanations.`;
}

/**
 * Build prompt for the safety/dosage page
 */
function buildSafetyPagePrompt(components: ComponentData[], _language: string): string {
  const getContent = (id: ComponentId): string | null => {
    const comp = components.find(c => c.component_id === id);
    return comp?.content || null;
  };

  const brandName = getContent('INIT_01a') || 'Product';
  const genericName = getContent('SOL_02') || '';
  const dosageInfo = getContent('SAFE_01') || '';
  const strengthForms = getContent('SAFE_02') || '';
  const safetyClaims = getContent('SAFE_03') || '';
  const sideEffects = getContent('SAFE_04') || '';
  const contraindications = getContent('SAFE_05') || '';
  const companyName = getContent('COMM_03') || '';
  const references = getContent('REG_02') || '';
  const abbreviatedPI = getContent('REG_01') || '';

  return `You are a Pharmaceutical Marketing Director creating a SAFETY & DOSAGE page for a Leave Behind Leaflet.

TASK: Generate Page 3 - SAFETY & DOSAGE INFORMATION page for ${brandName}

OUTPUT: Landscape orientation (16:9), high resolution, print-ready quality.

LOGO IMAGES: Logo images are provided separately labeled [COMPANY_LOGO] and [BRAND_LOGO].
INSERT these exact images - do NOT recreate them.

PAGE CONTENT - SAFETY & DOSAGE:

BRAND NAME: ${brandName}
GENERIC NAME: ${genericName}
COMPANY: ${companyName}

DOSAGE INFORMATION:
${dosageInfo || 'Standard dosing as per prescribing information'}

AVAILABLE STRENGTHS/FORMS:
${strengthForms || 'List available formulations'}

SAFETY PROFILE:
${safetyClaims || 'Well-tolerated safety profile'}

SIDE EFFECTS:
${sideEffects || 'Common side effects to be listed'}

CONTRAINDICATIONS:
${contraindications || 'Standard contraindications apply'}

ABBREVIATED PRESCRIBING INFORMATION:
${abbreviatedPI || 'Include abbreviated PI'}

REFERENCES:
${references || 'Clinical references'}

LAYOUT FOR THIS PAGE:
- Company logo: TOP-LEFT corner (use provided [COMPANY_LOGO] image)
- Brand logo: TOP-RIGHT corner (use provided [BRAND_LOGO] image)
- Page title: "DOSAGE & SAFETY" prominently displayed
- Dosage table/grid showing strengths and administration
- Safety information in organized sections
- Side effects in a clear list format
- Contraindications highlighted (use caution colors)
- References section at bottom
- Full prescribing information disclaimer
- Disclaimer bar at BOTTOM

DESIGN ELEMENTS:
- Dosage icons (pills, inhalers, etc.)
- Warning symbols for contraindications
- Clean table layouts for dosing information
- Color coding: Green for safety, Yellow/Orange for cautions

COLORS: Match the reference images color scheme
TEXT: ALL in ENGLISH only
QUALITY: Sharp, clear, print-ready

Generate ONLY the final image. No explanations.`;
}

/**
 * Get LOGO images that must be inserted exactly (not used as reference)
 * These are passed separately with explicit labels
 */
export function getLogoImages(components: ComponentData[]): {
  id: ComponentId;
  base64: string;
  label: string;
  position: string;
}[] {
  const logos: { id: ComponentId; base64: string; label: string; position: string }[] = [];

  for (const logoInfo of LOGO_COMPONENT_IDS) {
    const comp = components.find(c => c.component_id === logoInfo.id);
    if (comp?.image_base64) {
      logos.push({
        id: logoInfo.id,
        base64: comp.image_base64,
        label: logoInfo.label,
        position: logoInfo.position
      });
    }
  }

  return logos;
}

/**
 * Get DESIGN REFERENCE images (for style, not exact insertion)
 */
export function getDesignReferenceImages(components: ComponentData[]): {
  id: ComponentId;
  base64: string;
  description: string;
}[] {
  // These component IDs are logos - exclude them from design references
  const logoIds = LOGO_COMPONENT_IDS.map(l => l.id);

  const references: { id: ComponentId; base64: string; description: string }[] = [];

  for (const comp of components) {
    if (comp.image_base64 && !logoIds.includes(comp.component_id)) {
      const meta = COMPONENT_METADATA[comp.component_id];
      references.push({
        id: comp.component_id,
        base64: comp.image_base64,
        description: `${meta.name} - Design Reference`
      });
    }
  }

  return references;
}

/**
 * Build content array for API call with properly labeled images
 */
export function buildApiContent(
  prompt: string,
  components: ComponentData[]
): Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> {

  const content: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

  // Add main prompt
  content.push({ text: prompt });

  // Add LOGO images with labels (these must be inserted exactly)
  const logos = getLogoImages(components);
  for (const logo of logos) {
    content.push({
      text: `[${logo.label}] - INSERT this exact image at ${logo.position}:`
    });
    content.push({
      inlineData: {
        mimeType: 'image/png',
        data: logo.base64
      }
    });
  }

  // Add design reference images
  const references = getDesignReferenceImages(components);
  if (references.length > 0) {
    content.push({
      text: `[DESIGN_REFERENCES] - Use these for color palette, typography, and style (do NOT copy logos from these):`
    });
    for (const ref of references) {
      content.push({
        inlineData: {
          mimeType: 'image/png',
          data: ref.base64
        }
      });
    }
  }

  return content;
}

/**
 * Get image components that should be passed as reference (legacy function for compatibility)
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
  logos: { id: string; label: string; hasImage: boolean }[];
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

  // Check logo availability
  const logos = LOGO_COMPONENT_IDS.map(logoInfo => ({
    id: logoInfo.id,
    label: logoInfo.label,
    hasImage: !!components.find(c => c.component_id === logoInfo.id)?.image_base64
  }));

  return {
    total: components.length,
    bySection,
    mandatory: { present: presentMandatory, total: mandatoryIds.length },
    hasImages,
    logos
  };
}
