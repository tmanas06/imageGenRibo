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
// COMM_04 = Company Logo, INIT_01a = Brand Root Name (nebZmart logo)
const LOGO_COMPONENT_IDS: { id: ComponentId; label: string; position: string }[] = [
  { id: 'COMM_04', label: 'COMPANY_LOGO', position: 'TOP-LEFT' },
  { id: 'INIT_01a', label: 'BRAND_LOGO', position: 'TOP-RIGHT' },
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
  const headline = getContent('INIT_03') || 'In Moderate to Severe COPD';
  const genericName = getContent('SOL_02') || 'Glycopyrronium Inhalation Solution 25 mcg';
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
FORMAT: Like a PowerPoint presentation slide or TV screen (16:9 aspect ratio)
SIZE: 1920x1080 pixels or similar 16:9 proportions (NOT a wide banner, NOT a thin strip)
BRAND: ${brandName} by ${companyName}
LANGUAGE: English only (regional translations handled separately)
</context>

<chain_of_thought>
STEP-BY-STEP PROCESS:
1. READ the <content> section carefully
2. COPY each text string CHARACTER-FOR-CHARACTER (do not paraphrase)
3. LEAVE TOP-LEFT and TOP-RIGHT corners completely EMPTY (no logos, no company names)
4. GENERATE a new character matching the description
5. USE reference images for colors/style only (ignore any logos in them)
6. DOUBLE-CHECK spelling matches exactly what's in <content>
7. VERIFY: No "Glenmark", no logos, no company graphics ANYWHERE
</chain_of_thought>

<logo_placement>
IMPORTANT: DO NOT generate any logos. Leave these areas EMPTY/BLANK:
- TOP-LEFT corner: Reserved for company logo (will be added via post-processing)
- TOP-RIGHT corner: Reserved for brand logo (will be added via post-processing)

The logo areas should be:
- Clean background matching the header color
- NO text, NO graphics, NO placeholder boxes
- Just empty space where logos will be overlaid later
</logo_placement>

<design_references>
[DESIGN_REFERENCE] images → Use for colors, typography, icons, visual style
DO NOT copy any logos from these reference images
</design_references>

<content>
🔴 CRITICAL: COPY EACH TEXT STRING EXACTLY AS SHOWN - NO MODIFICATIONS 🔴

BRAND_NAME: "${brandName}"
GENERIC_NAME: "${genericName}"
HEADLINE: "${headline}"

📋 SIX SEPARATE CLAIMS (display each on its own line with an icon):

CLAIM_1: "Quick onset of action within 5 mins"
         ↳ Note: "onset" not "onest" or "onsst"

CLAIM_2: "12 hrs long lasting relief"
         ↳ This is SEPARATE from Claim 1

CLAIM_3: "Improves lung function by 120 ml"

CLAIM_4: "Prevention of exacerbation"
         ↳ Note: "exacerbation" (a-c-e-r-b-a-t-i-o-n)

CLAIM_5: "Reduces Hyper secretions"
         ↳ Note: "secretions" (s-e-c-r-e-t-i-o-n-s)

CLAIM_6: "Improves FEV1"

DISCLAIMER: "${disclaimer}"

🔴 EACH CLAIM = 1 SEPARATE LINE WITH ITS OWN ICON 🔴
</content>

<character>
${getCharacterPrompt(language)}
IMPORTANT: Generate a NEW person. Do NOT copy from reference images.
</character>

<layout>
┌─────────────────────────────────────────────────────────────────┐
│ [EMPTY]                                           [EMPTY]       │
│ (reserved for logo overlay)                (reserved for logo)  │
├──────────────────────── HEADLINE ───────────────────────────────┤
│                                                                 │
│  ┌──────────┐    ┌────────────────────────────────────────┐    │
│  │          │    │  BRAND_NAME                            │    │
│  │ CHARACTER│    │  GENERIC_NAME                          │    │
│  │          │    │                                        │    │
│  │          │    │  LEFT COLUMN:     RIGHT COLUMN:        │    │
│  │          │    │   CLAIM_1           CLAIM_4           │    │
│  │          │    │   CLAIM_2           CLAIM_5           │    │
│  │          │    │   CLAIM_3           CLAIM_6           │    │
│  └──────────┘    └────────────────────────────────────────┘    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                         DISCLAIMER                              │
└─────────────────────────────────────────────────────────────────┘

⚠️ 6 CLAIMS = 6 SEPARATE BULLET POINTS (3 left, 3 right)
⚠️ Each claim gets its own medical icon
⚠️ DO NOT merge claims together
</layout>

<rules>
<constraints>
- DO NOT generate any logos - leave blank areas at top-left and top-right
- All text copied EXACTLY from <content> section - character for character
- 6 claims = 6 SEPARATE lines (never combine claims on same line)
- No text generation or guessing - only copy provided text
- English only (no Hindi/Tamil/Devanagari)
- No overlapping elements
- No "COMPANY" or "BRAND" text badges
</constraints>

<freedom>
- Character pose and expression (within description)
- Icon styles (match reference aesthetic)
- Color gradients (from reference palette)
- Typography weight variations
- Header bar color (clean, professional)
</freedom>
</rules>

<few_shot_examples>
<text_copying_examples>
<good>
INPUT: CLAIM_1 = "Quick onset of action within 5 mins"
OUTPUT: "Quick onset of action within 5 mins" ✓
WHY: Character-for-character exact copy
</good>

<bad>
INPUT: CLAIM_1 = "Quick onset of action within 5 mins"
OUTPUT: "Quick onsst of action within 5 mins" ✗
WHY: Misspelled - should COPY, not type from memory
</bad>

<bad>
INPUT: CLAIM_4 = "Prevention of exacerbation"
OUTPUT: "Prevention of exrarebbation" ✗
WHY: Misspelled - COPY the exact text provided
</bad>

<good>
INPUT: DISCLAIMER = "For the use of a Registered Medical Practitioner, Hospital, or Laboratory only"
OUTPUT: "For the use of a Registered Medical Practitioner, Hospital, or Laboratory only" ✓
WHY: Exact copy of disclaimer text
</good>

<bad>
INPUT: DISCLAIMER text provided
OUTPUT: "For the use of a Registered Medical Practitinor, Hosptial, or Laboraatory only" ✗
WHY: Multiple misspellings - should have copied EXACTLY
</bad>
</text_copying_examples>

<logo_examples>
<good>
INPUT: Leave top-left corner empty
OUTPUT: Clean teal/colored header bar with no graphics at corners ✓
WHY: Proper empty space for logo overlay
</good>

<bad>
INPUT: Leave top-left corner empty
OUTPUT: Generated "Glenmark" logo or company name ✗
WHY: Should be EMPTY - logos added via post-processing
</bad>
</logo_examples>
</few_shot_examples>

<spelling_check>
🚫 BANNED MISSPELLINGS - If you write any of these, START OVER:
- onsst, onest → CORRECT: onset
- exrarebbation, exaerebation, exaberbation → CORRECT: exacerbation
- secruitions, secrustions → CORRECT: secretions
- Practitinor, Practitoner → CORRECT: Practitioner
- Laboraatory, Labratory → CORRECT: Laboratory
- Registerd → CORRECT: Registered
- Hosptial → CORRECT: Hospital
- rexepecation → NOT A WORD (don't use)
- Rect bation → NOT A WORD (don't use)

✅ SOLUTION: Copy text EXACTLY from <content> section - don't generate new text!
</spelling_check>

<self_correction>
Before finalizing, COUNT and VERIFY:
□ TOP-LEFT corner is BLANK? (no logo - will be added later)
□ TOP-RIGHT corner is BLANK? (no logo - will be added later)
□ Exactly 6 claim bullet points visible? (3 left + 3 right)
□ CLAIM_1 and CLAIM_2 are on SEPARATE lines? (not merged)
□ "onset" spelled correctly? (not "onest" or "onsst")
□ "exacerbation" spelled correctly? (not "exaerebation")
□ "secretions" spelled correctly? (not "secreutions")
□ Disclaimer bar visible at bottom?
□ Character is a NEW person (not from references)?
</self_correction>

<output_format>
FORMAT: Single image like a PowerPoint slide or TV screen
ASPECT_RATIO: 16:9 (sixteen by nine) - like a widescreen TV
DIMENSIONS: Width=1920, Height=1080 (or proportional like 2560x1440)

⚠️ DO NOT generate a wide banner (4:1 or 3:1 ratio)
⚠️ DO NOT generate a thin horizontal strip
⚠️ The image should be roughly as tall as it is wide (16:9 means height is about 56% of width)

EXAMPLE: If width is 1920px, height must be ~1080px (NOT 480px or 512px)

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
 * NOTE: Logo images are NOT sent to AI - they are overlaid in post-processing
 */
export function buildApiContent(
  prompt: string,
  components: ComponentData[]
): Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> {

  const content: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

  // Add main prompt
  content.push({ text: prompt });

  // NOTE: We do NOT send logo images to the AI anymore
  // Logos will be overlaid via post-processing (logoOverlayService.ts)
  // This prevents the AI from trying to recreate/interpret logos

  // Add design reference images (excluding logos)
  const references = getDesignReferenceImages(components);
  if (references.length > 0) {
    content.push({
      text: `[DESIGN_REFERENCES] - Use these for color palette, typography, icons, and visual style. DO NOT copy any logos from these images:`
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
