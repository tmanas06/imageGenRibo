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
  // Note: Slogan (INIT_08) is an IMAGE - it will be overlaid in post-processing
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
3. LEAVE TOP-LEFT CORNER BLANK (logo added later)
4. LEAVE TOP-RIGHT CORNER BLANK (logo added later)
5. LEAVE BLANK SPACE below headline for slogan (slogan image added later)
6. GENERATE a new character matching the description
7. USE reference images for colors/style only
8. DOUBLE-CHECK spelling: onset, exacerbation, secretions, Practitioner
</chain_of_thought>

<logo_placement>
🚫 LOGO AREAS - LEAVE COMPLETELY BLANK 🚫

TOP-LEFT CORNER: Leave EMPTY (no logo, no text, no "Glenmark", nothing)
TOP-RIGHT CORNER: Leave EMPTY (no logo, no text, no "nebZmart", nothing)

Logos will be added via post-processing. DO NOT generate:
❌ Company name text (no "Glenmark" or similar)
❌ Brand name text in header (no "nebZmart" in corners)
❌ Any logo-like graphics in corners
❌ Any colored boxes/panels in the header corners

Just leave clean, empty space in both top corners.
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

⚠️ SLOGAN AREA: DO NOT generate ANY text, boxes, rectangles, or placeholders below the headline
   Leave it COMPLETELY EMPTY - no borders, no boxes, no outlines, just blank background
   (The slogan image will be overlaid in post-processing)

📋 SIX CLAIMS - COPY THESE EXACT STRINGS:

┌─────────────────────────────────────────────────┐
│ CLAIM 1: Quick onset of action within 5 mins   │
│          ^^^^^ = o-n-s-e-t (NOT "onest")       │
├─────────────────────────────────────────────────┤
│ CLAIM 2: 12 hrs long lasting relief            │
├─────────────────────────────────────────────────┤
│ CLAIM 3: Improves lung function by 120 ml      │
├─────────────────────────────────────────────────┤
│ CLAIM 4: Prevention of exacerbation            │
│          ^^^^^^^^^^^^^ = e-x-a-c-e-r-b-a-t-i-o-n │
├─────────────────────────────────────────────────┤
│ CLAIM 5: Reduces Hyper secretions              │
│          ^^^^^^^^^^ = s-e-c-r-e-t-i-o-n-s      │
├─────────────────────────────────────────────────┤
│ CLAIM 6: Improves FEV1                         │
└─────────────────────────────────────────────────┘

DISCLAIMER: "${disclaimer}"

🔴 COPY EXACTLY - DO NOT RETYPE FROM MEMORY 🔴
</content>

<character>
${getCharacterPrompt(language)}
IMPORTANT: Generate a NEW person. Do NOT copy from reference images.
</character>

<layout>
┌─────────────────────────────────────────────────────────────────┐
│ [BLANK]                                             [BLANK]     │
│ (logo added later)                          (logo added later)  │
├─────────────────────────────────────────────────────────────────┤
│                         HEADLINE                                │
│                    (In Moderate to Severe COPD)                 │
│                                                                 │
│                    [BLANK - slogan image added later]           │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐    ┌────────────────────────────────────────┐     │
│  │          │    │  BRAND_NAME + GENERIC_NAME             │     │
│  │ CHARACTER│    │                                        │     │
│  │          │    │  LEFT COLUMN:     RIGHT COLUMN:        │     │
│  │          │    │   CLAIM_1           CLAIM_4            │     │
│  │          │    │   CLAIM_2           CLAIM_5            │     │
│  │          │    │   CLAIM_3           CLAIM_6            │     │
│  └──────────┘    └────────────────────────────────────────┘     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                         DISCLAIMER                              │
└─────────────────────────────────────────────────────────────────┘

⚠️ TOP CORNERS = BLANK (logos added via post-processing)
⚠️ SLOGAN AREA = BLANK - NO boxes, NO rectangles, NO placeholders (slogan added via post-processing)
⚠️ 6 CLAIMS = 6 SEPARATE BULLET POINTS (3 left, 3 right)
</layout>

<rules>
<constraints>
- TOP-LEFT and TOP-RIGHT corners must be BLANK (logos added later)
- SLOGAN AREA must be COMPLETELY BLANK below headline - NO boxes, NO rectangles, NO borders, NO outlines, NO placeholders (slogan image added later)
- All text copied EXACTLY from <content> section - character for character
- 6 claims = 6 SEPARATE lines (never combine claims on same line)
- No text generation or guessing - only copy provided text
- English only (no Hindi/Tamil/Devanagari)
- No overlapping elements
- DO NOT generate "Glenmark", "nebZmart", "Shwaas", or "Each breath matters" - these are overlaid
- DO NOT draw any empty boxes or rectangular placeholders anywhere on the image
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
INPUT: "Quick onset of action within 5 mins"
OUTPUT: "Quick onset of action within 5 mins" ✓
WHY: Exact copy - "onset" spelled correctly
</good>

<bad>
INPUT: "Quick onset of action within 5 mins"
OUTPUT: "Quick onest of action within 5 mins" ✗
WHY: "onest" is WRONG - should be "onset"
</bad>

<good>
INPUT: "Prevention of exacerbation"
OUTPUT: "Prevention of exacerbation" ✓
WHY: Exact copy - "exacerbation" spelled correctly
</good>

<bad>
INPUT: "Prevention of exacerbation"
OUTPUT: "Prevention of exaberbation" ✗
WHY: "exaberbation" is WRONG - should be "exacerbation"
</bad>

<good>
INPUT: "Reduces Hyper secretions"
OUTPUT: "Reduces Hyper secretions" ✓
WHY: Exact copy - "secretions" spelled correctly
</good>

<bad>
INPUT: "Reduces Hyper secretions"
OUTPUT: "Reduces Hyper secrortions" ✗
WHY: "secrortions" is WRONG - should be "secretions"
</bad>
</text_copying_examples>

<logo_examples>
<good>
INPUT: Leave corners blank for logos
OUTPUT: Clean header with empty space at TOP-LEFT and TOP-RIGHT ✓
WHY: Proper blank space for logo overlay in post-processing
</good>

<bad>
INPUT: Leave corners blank
OUTPUT: Generated "Glenmark" text or logo graphic in corner ✗
WHY: Should be BLANK - logos added via post-processing
</bad>

<bad>
INPUT: Leave corners blank
OUTPUT: Large teal box with "nebZmart" text ✗
WHY: Should be BLANK - no text, no boxes, no graphics in corners
</bad>
</logo_examples>
</few_shot_examples>

<spelling_check>
🚫 BANNED MISSPELLINGS - If you write any of these, START OVER:

❌ onest, onsst → ✅ onset (o-n-s-e-t)
❌ exaberbation, exabrebation → ✅ exacerbation (e-x-a-c-e-r-b-a-t-i-o-n)
❌ secrtations, secrestions, secrortions → ✅ secretions (s-e-c-r-e-t-i-o-n-s)
❌ Practitoner, Practitoror → ✅ Practitioner (P-r-a-c-t-i-t-i-o-n-e-r)

MOST COMMON ERRORS (you keep making these!):
- "onest" is WRONG → write "onset"
- "exaberbation" is WRONG → write "exacerbation"
- "secrortions" is WRONG → write "secretions"

✅ SOLUTION: Copy the EXACT text from the boxes in <content> section!
</spelling_check>

<self_correction>
Before finalizing, VERIFY SPELLING CHARACTER BY CHARACTER:

□ "onset" - is it spelled o-n-s-e-t? (NOT "onest")
□ "exacerbation" - is it spelled e-x-a-c-e-r-b-a-t-i-o-n? (NOT "exaberbation")
□ "secretions" - is it spelled s-e-c-r-e-t-i-o-n-s? (NOT "secrortions")
□ "Practitioner" - is it spelled P-r-a-c-t-i-t-i-o-n-e-r? (NOT "Practitoner")

ALSO CHECK:
□ TOP-LEFT corner is BLANK for logo overlay?
□ TOP-RIGHT corner is BLANK for logo overlay?
□ SLOGAN area is BLANK below headline for overlay?
□ Exactly 6 claim bullet points visible?
□ Disclaimer bar at bottom?
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

  // NOTE: Logo images (COMM_04, INIT_01a) and Slogan (INIT_08) are NOT sent to AI
  // They will be overlaid in post-processing by logoOverlayService.ts
  // AI is instructed to leave blank spaces for these elements

  // Add design reference images (excluding logos and slogan - they are overlaid)
  const excludeIds = ['INIT_08', 'COMM_04', 'INIT_01a']; // All overlaid in post-processing
  const references = getDesignReferenceImages(components).filter(r => !excludeIds.includes(r.id));
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
