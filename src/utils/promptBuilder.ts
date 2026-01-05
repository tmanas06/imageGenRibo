import type { ComponentData, ComponentId } from '../services/componentService';
import { COMPONENT_METADATA, groupComponentsBySection } from '../services/componentService';

// Focus area types for LBL generation
export type FocusAreaType = 'Efficacy' | 'Safety' | 'Evidence';

// Logo component IDs - these are treated as assets to INSERT, not references
const LOGO_COMPONENT_IDS: { id: ComponentId; label: string; position: string }[] = [
  { id: 'COMM_04', label: 'COMPANY_LOGO', position: 'TOP-LEFT' },
  { id: 'INIT_02', label: 'BRAND_LOGO', position: 'TOP-RIGHT' },
];

/**
 * Build AI prompt from fetched components based on focus area
 */
export function buildPromptFromComponents(
  components: ComponentData[],
  focusArea: string = 'Efficacy'
): string {
  return buildFocusAreaPrompt(components, focusArea);
}

/**
 * Build prompt for LBL based on focus area
 * Uses high-fidelity pharmaceutical LBL prompt template
 * 
 */
function buildFocusAreaPrompt(components: ComponentData[], focusArea: string = 'Efficacy'): string {
  // Helper to get component content
  const getContent = (id: ComponentId): string | null => {
    const comp = components.find(c => c.component_id === id);
    return comp?.content || null;
  };

  // Helper to get all content for a component type (for multiple entries like claims)
  const getAllContent = (id: ComponentId): string[] => {
    return components
      .filter(c => c.component_id === id && c.content)
      .map(c => c.content as string);
  };

  // Extract key data from components
  const brandName = getContent('INIT_01a') || '[Brand Name]';
  const brandVariant = getContent('INIT_01b') || '';
  const fullBrandName = brandVariant ? `${brandName} ${brandVariant}` : brandName;

  const genericComposition = getContent('SOL_02') || '[Generic / Composition]';
  const indication = getContent('INS_04') || getContent('INIT_03') || '[Indication]';

  // Collect all claims
  const claims = getAllContent('SOL_01');
  const efficacyClaims = getAllContent('EVID_01');
  const safetyClaims = getAllContent('SAFE_03');

  // Build focus area content
  const focusAreaContent = buildFocusAreaContent(claims, efficacyClaims, safetyClaims, focusArea, components);

  // Get focus-area-specific design instructions
  const focusAreaDesign = getFocusAreaDesignInstructions(focusArea);

  // Regulatory
  const disclaimer = getContent('REG_05') || 'For the use of a Registered Medical Practitioner, Hospital, or Laboratory only';

  // Brand color theme (extract from brand or use default)
  const brandColorTheme = 'brand primary colors from logo and reference images';

  // Build the prompt
  const prompt = `You are generating a high-fidelity, print-ready pharmaceutical
Leave Behind Leaflet (LBL) for medical professionals.

================================================================================
IMAGE REFERENCES (CRITICAL – DO NOT IGNORE)
================================================================================

You are PROVIDED the following reference images as inputs:

1) BRAND LOGO IMAGE:
   → [BRAND_LOGO] image provided below
   RULE:
   • Reproduce this logo EXACTLY as provided
   • Do NOT redraw, reinterpret, recolor, stylize, or regenerate
   • Preserve original proportions, colors, typography, and symbol

2) COMPANY LOGO IMAGE:
   → [COMPANY_LOGO] image provided below
   RULE:
   • Reproduce this logo EXACTLY as provided
   • Do NOT redraw, reinterpret, recolor, stylize, or regenerate

3) REFERENCE LBL DESIGN IMAGES:
   → [DESIGN_REFERENCE] images provided below

   PURPOSE:
   • These images define the EXPECTED DESIGN QUALITY and VISUAL GRAMMAR
   • They are NOT to be cloned or copied
   • Use them ONLY to understand:
     – professional pharmaceutical tone
     – visual hierarchy
     – information density
     – modern LBL aesthetics (NOT PowerPoint)

================================================================================
CANVAS & QUALITY
================================================================================
• Orientation: LANDSCAPE
• Resolution: 2560 x 1440
• Print-ready, sharp, professional quality
• Editorial / journal-grade design (NOT presentation slides)

================================================================================
BRANDING RULES (NON-NEGOTIABLE)
================================================================================
• Overall color theme MUST align with ${brandColorTheme}
• Brand and company logos must be visually clean and unobstructed
• Logos must NOT overlap content
• Logos must NOT be used as decorative textures or backgrounds

================================================================================
PRODUCT IDENTITY (CONTENT PROVIDED AS-IS)
================================================================================
Brand Name:
${fullBrandName}

Generic / Composition:
${genericComposition}

Indication:
${indication}

================================================================================
FOCUS AREA LOGIC
================================================================================
ACTIVE FOCUS AREA:
${focusArea}
(Example values: Efficacy | Safety | Evidence)

ALL CONTENT PROVIDED FROM DATABASE:
${focusAreaContent}

INSTRUCTIONS:
• The ACTIVE focus area must visually dominate the page
• Related content may appear only as supporting information
• Do NOT label sections on the design (no "Efficacy", "Safety" headers)
• The page must read as ONE integrated scientific message

================================================================================
DESIGN INTENT (THIS IS THE CORE INSTRUCTION)
================================================================================
• This is NOT a slide, brochure, or PPT
• The page must function as a single visual argument
• One dominant visual idea should anchor the message
• Supporting information should flow, connect, or orbit naturally
• Numbers and outcomes must feel embedded into the design
• Visual hierarchy must be obvious without boxes or bullets

================================================================================
FOCUS-SPECIFIC DESIGN DIRECTION
================================================================================
${focusAreaDesign}

================================================================================
ALLOWED VISUAL LANGUAGE
================================================================================
• Modern pharmaceutical infographic style
• Abstract scientific motifs (curves, gradients, molecular hints)
• Visual metaphors for reduction, improvement, stability, protection
• Subtle depth and layering is allowed

================================================================================
STRICT ANTI-PATTERNS (ABSOLUTELY FORBIDDEN)
================================================================================
• No PowerPoint-style layouts
• No bullet lists
• No boxed content panels
• No equal-weight text blocks
• No rigid grids that fragment the page
• No childish icons or clip-art
• No decorative shapes without informational purpose

================================================================================
TYPOGRAPHY RULES
================================================================================
• Professional pharmaceutical typography
• Short, precise phrases only (no paragraphs)
• Clear hierarchy: dominant → supporting → regulatory
• Scientific, credible tone — not marketing hype

================================================================================
REGULATORY FOOTER
================================================================================
Include the following text EXACTLY, unobtrusively:
${disclaimer}

================================================================================
OUTPUT
================================================================================
• Generate ONE final image only
• No explanations, labels, wireframes, or commentary
• The result must look like a professionally designed pharmaceutical LBL,
  NOT a presentation slide or PPT`;

  return prompt;
}

/**
 * Build focus area content from claims with focus-specific formatting
 */
function buildFocusAreaContent(
  claims: string[],
  efficacyClaims: string[],
  safetyClaims: string[],
  focusArea: string,
  components: ComponentData[]
): string {
  const sections: string[] = [];

  // Helper to get component content
  const getContent = (id: ComponentId): string | null => {
    const comp = components.find(c => c.component_id === id);
    return comp?.content || null;
  };

  // Focus-specific primary content
  if (focusArea === 'Efficacy') {
    sections.push(`=== PRIMARY FOCUS: EFFICACY ===`);
    sections.push(`VISUAL EMPHASIS: Clinical efficacy data, onset of action, duration of relief`);

    if (efficacyClaims.length > 0) {
      sections.push(`EFFICACY CLAIMS (DOMINANT):\n${efficacyClaims.map(c => `★ ${c}`).join('\n')}`);
    }
    if (claims.length > 0) {
      sections.push(`KEY USP CLAIMS:\n${claims.map(c => `• ${c}`).join('\n')}`);
    }

    // Add efficacy-specific data
    const studySummary = getContent('EVID_03');
    if (studySummary) {
      sections.push(`STUDY DATA:\n${studySummary}`);
    }
  }

  if (focusArea === 'Safety') {
    sections.push(`=== PRIMARY FOCUS: SAFETY ===`);
    sections.push(`VISUAL EMPHASIS: Tolerability, safety profile, well-tolerated therapy`);

    if (safetyClaims.length > 0) {
      sections.push(`SAFETY CLAIMS (DOMINANT):\n${safetyClaims.map(c => `★ ${c}`).join('\n')}`);
    }

    // Add safety-specific data
    const dosageInfo = getContent('SAFE_01');
    const sideEffects = getContent('SAFE_04');
    const contraindications = getContent('SAFE_05');

    if (dosageInfo) sections.push(`DOSAGE:\n${dosageInfo}`);
    if (sideEffects) sections.push(`SIDE EFFECTS:\n${sideEffects}`);
    if (contraindications) sections.push(`CONTRAINDICATIONS:\n${contraindications}`);

    // Supporting claims
    if (claims.length > 0) {
      sections.push(`SUPPORTING USP CLAIMS:\n${claims.slice(0, 3).map(c => `• ${c}`).join('\n')}`);
    }
  }

  if (focusArea === 'Evidence') {
    sections.push(`=== PRIMARY FOCUS: CLINICAL EVIDENCE ===`);
    sections.push(`VISUAL EMPHASIS: Scientific data, clinical studies, guidelines, p-values`);

    // Add evidence-specific data
    const studySummary = getContent('EVID_03');
    const guidelineText = getContent('EVID_05');
    const references = getContent('REG_02');

    if (efficacyClaims.length > 0) {
      sections.push(`EVIDENCE-BASED CLAIMS (DOMINANT):\n${efficacyClaims.map(c => `★ ${c}`).join('\n')}`);
    }
    if (studySummary) sections.push(`CLINICAL STUDY SUMMARY:\n${studySummary}`);
    if (guidelineText) sections.push(`GUIDELINE RECOMMENDATIONS:\n${guidelineText}`);
    if (references) sections.push(`REFERENCES:\n${references}`);

    // Supporting claims
    if (claims.length > 0) {
      sections.push(`SUPPORTING USP CLAIMS:\n${claims.slice(0, 3).map(c => `• ${c}`).join('\n')}`);
    }
  }

  return sections.join('\n\n') || '[No content provided - extract from reference images]';
}

/**
 * Get focus-area-specific design instructions
 */
function getFocusAreaDesignInstructions(focusArea: string): string {
  const instructions: Record<string, string> = {
    'Efficacy': `
EFFICACY FOCUS - DESIGN DIRECTION:
• Dominant visual: Speed/time metaphor (clock, stopwatch, timeline)
• Show "onset" and "duration" as the hero message
• Use dynamic, energetic visual flow
• Color emphasis: Brand colors with action-oriented accents
• Data visualization: Timeline showing onset → sustained relief
• Metaphor suggestions: Racing pulse calming down, breath flowing freely
• Numbers to highlight: onset time (5 mins), duration (12 hrs)`,

    'Safety': `
SAFETY FOCUS - DESIGN DIRECTION:
• Dominant visual: Protection/shield metaphor, calm and reassuring
• Show "well-tolerated" and "safe profile" as the hero message
• Use calm, stable visual flow - NOT aggressive
• Color emphasis: Softer brand colors, green accents for safety
• Data visualization: Safety percentages, tolerability charts
• Metaphor suggestions: Protective embrace, steady foundation, balanced scale
• Convey: Trust, reliability, gentle efficacy`,

    'Evidence': `
EVIDENCE FOCUS - DESIGN DIRECTION:
• Dominant visual: Scientific/clinical data presentation
• Show clinical study results and p-values as hero content
• Use structured, authoritative visual flow
• Color emphasis: Professional, scientific palette
• Data visualization: Bar charts, statistical comparisons, study endpoints
• Metaphor suggestions: Scientific precision, proven results, guideline alignment
• Include: Study names, patient numbers, statistical significance markers`
  };

  return instructions[focusArea] || instructions['Efficacy'];
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
