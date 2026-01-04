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

  // Extract data - these should come from database with CORRECT spelling
  const brandName = getContent('INIT_01a') || 'nebZmart';
  const brandVariant = getContent('INIT_01b') || '';
  const headline = getContent('INIT_03') || 'In Moderate to Severe COPD';
  const genericName = getContent('SOL_02') || 'Glycopyrronium Inhalation Solution 25 mcg';
  // SOL_03 can be used for secondary generic name if available
  const genericNameVariant = getContent('SOL_03') || '';
  const disclaimer = getContent('REG_05') || 'For the use of a Registered Medical Practitioner, Hospital, or Laboratory only';
  const companyName = getContent('COMM_03') || 'Glenmark';

  // Build the prompt using structured framework
  const prompt = `
<role>
You are a Senior Pharmaceutical Visual Designer with 15 years of experience creating regulatory-compliant Leave Behind Leaflets (LBLs) for top Indian pharmaceutical companies. You specialize in print-ready marketing materials that pass medical-legal review.
</role>

<context>
WHY: Create a professional LBL for medical representatives to leave with doctors after detailing visits.
AUDIENCE: Healthcare professionals (doctors, specialists)
USAGE: Print material (2560x1440px, landscape, 16:9)
BRAND: ${brandName} by ${companyName}
LANGUAGE: English only (regional translations handled separately)
</context>

<chain_of_thought>
Before generating, follow these steps:
1. IDENTIFY the provided logo images ([COMPANY_LOGO], [BRAND_LOGO])
2. PLACE logos in correct positions (company=top-left, brand=top-right)
3. COPY exact text strings from the content section below
4. GENERATE a new character matching the description
5. APPLY colors and style from design reference images
6. VERIFY spelling against the banned words list
7. CHECK that each logo appears exactly once
</chain_of_thought>

<assets>
<logos>
[COMPANY_LOGO] → Insert at TOP-LEFT corner (do not recreate)
[BRAND_LOGO] → Insert at TOP-RIGHT corner (do not recreate)
</logos>

<design_references>
[DESIGN_REFERENCE] images → Use for colors, typography, icons, visual style
</design_references>
</assets>

<content>
<brand_info>
BRAND: ${brandName}${brandVariant ? ` + ${brandVariant}` : ''}
GENERIC: "${genericName}"
${genericNameVariant ? `GENERIC_2: "${genericNameVariant}"` : ''}
HEADLINE: "${headline}"
COMPANY: ${companyName}
</brand_info>

<claims_left_column>
CLAIM_1: "Quick onset of action within 5 mins"
CLAIM_2: "12 hrs long lasting relief"
CLAIM_3: "Improves lung function by 120 ml"
</claims_left_column>

<claims_right_column>
CLAIM_4: "Prevention of exacerbation"
CLAIM_5: "Reduces Hyper secretions"
CLAIM_6: "Improves FEV1"
</claims_right_column>

<disclaimer>
"${disclaimer}"
</disclaimer>
</content>

<character>
${getCharacterPrompt(language)}
IMPORTANT: Generate a NEW person. Do NOT copy from reference images.
</character>

<layout>
┌─────────────────────────────────────────────────────────────────┐
│ [COMPANY_LOGO]                              [BRAND_LOGO]        │
│ (top-left)                                  (top-right)         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐    ┌────────────────────────────────────────┐    │
│  │          │    │  BRAND NAME                            │    │
│  │ CHARACTER│    │  Generic name                          │    │
│  │  (30%)   │    │                                        │    │
│  │          │    │  CLAIMS (left)      CLAIMS (right)     │    │
│  │          │    │  • Claim 1          • Claim 4          │    │
│  │          │    │  • Claim 2          • Claim 5          │    │
│  │          │    │  • Claim 3          • Claim 6          │    │
│  └──────────┘    └────────────────────────────────────────┘    │
│                                    (70%)                        │
├─────────────────────────────────────────────────────────────────┤
│                    DISCLAIMER BAR (full width)                  │
└─────────────────────────────────────────────────────────────────┘
</layout>

<rules>
<constraints>
- Each logo appears exactly ONCE
- All text copied verbatim from <content> section
- No text generation or guessing
- English only (no Hindi/Tamil/Devanagari)
- No overlapping elements
</constraints>

<freedom>
- Character pose and expression (within description)
- Icon styles (match reference aesthetic)
- Color gradients (from reference palette)
- Typography weight variations
</freedom>
</rules>

<few_shot_examples>
<good_example>
INPUT: CLAIM_1 = "Quick onset of action within 5 mins"
OUTPUT: Text reads "Quick onset of action within 5 mins" ✓
REASON: Exact copy, correct spelling
</good_example>

<bad_example>
INPUT: CLAIM_1 = "Quick onset of action within 5 mins"
OUTPUT: Text reads "Quick onest of action within 5 mins" ✗
REASON: Misspelled "onset" as "onest"
</bad_example>

<good_example>
INPUT: [COMPANY_LOGO] provided
OUTPUT: Logo inserted at top-left, appears once ✓
REASON: Used provided image, correct position, no duplication
</good_example>

<bad_example>
INPUT: [COMPANY_LOGO] provided
OUTPUT: Logo recreated with text "Glenmark" + "COMPANY" badge ✗
REASON: Should use provided image, not generate new logo or add badges
</bad_example>

<good_example>
INPUT: CLAIM_2 = "12 hrs long lasting relief"
OUTPUT: Text reads "12 hrs long lasting relief" ✓
REASON: Exact copy, no mixing with other claims
</good_example>

<bad_example>
INPUT: CLAIM_2 = "12 hrs long lasting relief"
OUTPUT: Text reads "12 hrs long lasting relief 5 mins" ✗
REASON: Mixed content from CLAIM_1 into CLAIM_2
</bad_example>
</few_shot_examples>

<spelling_check>
BANNED (wrong) → CORRECT:
- onest → onset
- exaerebation → exacerbation
- exaberbation → exacerbation
- secrustions → secretions
- Practitoner → Practitioner
- Registerd → Registered
- Hosptial → Hospital
- Labratory → Laboratory
</spelling_check>

<self_correction>
Before finalizing, verify:
□ Company logo appears exactly 1 time at top-left?
□ Brand logo appears exactly 1 time at top-right?
□ No "COMPANY" badge or extra labels added to logos?
□ All claims spelled correctly (check against <spelling_check>)?
□ Each claim is separate (no mixing of content)?
□ Disclaimer text is complete and legible?
□ Character is NEW (not copied from references)?
□ All text is in English only?
</self_correction>

<output_format>
FORMAT: Single image
RESOLUTION: 2560x1440 pixels
ORIENTATION: Landscape (16:9)
QUALITY: Print-ready, sharp, no blur
RESPONSE: Image only, no text explanation
</output_format>
`;

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
