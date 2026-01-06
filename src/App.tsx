import { useState, useCallback, useEffect } from 'react';
import { ProductSelect } from './components/ProductSelect';
import { ImageOutput } from './components/ImageOutput';
import { GenerateButton } from './components/GenerateButton';
import { generateImage, isApiConfigured } from './services/nanoBananaService';
import { overlayLogos } from './services/logoOverlayService';
import { extractAllContent, getExtractionSummary } from './services/contentExtractorService';
import type { ComponentData, Document, ComponentId } from './services/componentService';
import { COMPONENT_METADATA } from './services/componentService';
import { buildPromptFromComponents, buildApiContent } from './utils/promptBuilder';

// Default prompt template (editable version with ${variables})
const DEFAULT_PROMPT = `You are generating a high-fidelity, print-ready pharmaceutical
Leave Behind Leaflet (LBL) for medical professionals.

================================================================================
IMAGE REFERENCES (CRITICAL – DO NOT IGNORE)
================================================================================

You are PROVIDED the following reference images as inputs:

1) BRAND LOGO IMAGE:
   → [BRAND_LOGO] image provided below
   RULE:
   • DO NOT include this logo in the generated image
   • The logo will be added automatically in post-processing
   • Use this image ONLY to extract brand colors for the design

2) COMPANY LOGO IMAGE:
   → [COMPANY_LOGO] image provided below
   RULE:
   • DO NOT include this logo in the generated image
   • The logo will be added automatically in post-processing
   • Use this image ONLY to extract company colors for the design

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
• Overall color theme MUST align with \${brandColorTheme}
• DO NOT GENERATE ANY LOGOS - logos will be added in post-processing
• LEAVE TOP-LEFT CORNER EMPTY for company logo placement
• LEAVE TOP-RIGHT CORNER EMPTY for brand logo placement
• Reserve approximately 12% width x 15% height in each corner for logos
• These empty spaces should blend with the background design

================================================================================
PRODUCT IDENTITY (CONTENT PROVIDED AS-IS)
================================================================================
Brand Name:
\${fullBrandName}

Generic / Composition:
\${genericComposition}

Indication:
\${indication}

================================================================================
FOCUS AREA LOGIC
================================================================================
ACTIVE FOCUS AREA:
\${focusArea}
(Example values: Efficacy | Safety | Evidence)

ALL CONTENT PROVIDED FROM DATABASE:
\${focusAreaContent}

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
\${focusAreaDesign}

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
• NO LOGOS - do not generate, draw, or include any company or brand logos
• Leave TOP-LEFT and TOP-RIGHT corners completely empty for logo overlay

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
\${disclaimer}

================================================================================
OUTPUT
================================================================================
• Generate ONE final image only
• No explanations, labels, wireframes, or commentary
• The result must look like a professionally designed pharmaceutical LBL,
  NOT a presentation slide or PPT`;

// Fixed reference prompt (read-only, for reference)
const FIXED_REFERENCE_PROMPT = `You are generating a high-fidelity, print-ready pharmaceutical
Leave Behind Leaflet (LBL) for medical professionals.

================================================================================
IMAGE REFERENCES (CRITICAL – DO NOT IGNORE)
================================================================================

You are PROVIDED the following reference images as inputs:

1) BRAND LOGO IMAGE:
   → [BRAND_LOGO] image provided below
   RULE:
   • DO NOT include this logo in the generated image
   • The logo will be added automatically in post-processing
   • Use this image ONLY to extract brand colors for the design

2) COMPANY LOGO IMAGE:
   → [COMPANY_LOGO] image provided below
   RULE:
   • DO NOT include this logo in the generated image
   • The logo will be added automatically in post-processing
   • Use this image ONLY to extract company colors for the design

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
• Overall color theme MUST align with \${brandColorTheme}
• DO NOT GENERATE ANY LOGOS - logos will be added in post-processing
• LEAVE TOP-LEFT CORNER EMPTY for company logo placement
• LEAVE TOP-RIGHT CORNER EMPTY for brand logo placement
• Reserve approximately 12% width x 15% height in each corner for logos
• These empty spaces should blend with the background design

================================================================================
PRODUCT IDENTITY (CONTENT PROVIDED AS-IS)
================================================================================
Brand Name:
\${fullBrandName}

Generic / Composition:
\${genericComposition}

Indication:
\${indication}

================================================================================
FOCUS AREA LOGIC
================================================================================
ACTIVE FOCUS AREA:
\${focusArea}
(Example values: Efficacy | Safety | Evidence)

ALL CONTENT PROVIDED FROM DATABASE:
\${focusAreaContent}

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
\${focusAreaDesign}

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
• NO LOGOS - do not generate, draw, or include any company or brand logos
• Leave TOP-LEFT and TOP-RIGHT corners completely empty for logo overlay

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
\${disclaimer}

================================================================================
OUTPUT
================================================================================
• Generate ONE final image only
• No explanations, labels, wireframes, or commentary
• The result must look like a professionally designed pharmaceutical LBL,
  NOT a presentation slide or PPT`;

// Default selected components per focus area
const DEFAULT_SELECTED_COMPONENTS: Record<string, ComponentId[]> = {
  'Efficacy': ['INIT_01a', 'INIT_01b', 'INIT_03', 'SOL_01', 'SOL_02', 'EVID_01', 'EVID_03', 'INS_04', 'REG_05'],
  'Safety': ['INIT_01a', 'INIT_01b', 'SOL_02', 'SAFE_01', 'SAFE_02', 'SAFE_03', 'SAFE_04', 'SAFE_05', 'INS_04', 'REG_05'],
  'Evidence': ['INIT_01a', 'INIT_01b', 'SOL_02', 'EVID_01', 'EVID_03', 'EVID_05', 'REG_02', 'INS_04', 'REG_05'],
};

// Default theme-specific prompts
const DEFAULT_THEME_PROMPTS: Record<string, string> = {
  'Efficacy': `EFFICACY FOCUS - DESIGN DIRECTION:
• Dominant visual: Speed/time metaphor (clock, stopwatch, timeline)
• Show "onset" and "duration" as the hero message
• Use dynamic, energetic visual flow
• Color emphasis: Brand colors with action-oriented accents
• Data visualization: Timeline showing onset → sustained relief
• Metaphor suggestions: Racing pulse calming down, breath flowing freely
• Numbers to highlight: onset time, duration of action`,

  'Safety': `SAFETY FOCUS - DESIGN DIRECTION:
• Dominant visual: Protection/shield metaphor, calm and reassuring
• Show "well-tolerated" and "safe profile" as the hero message
• Use calm, stable visual flow - NOT aggressive
• Color emphasis: Softer brand colors, green accents for safety
• Data visualization: Safety percentages, tolerability charts
• Metaphor suggestions: Protective embrace, steady foundation, balanced scale
• Convey: Trust, reliability, gentle efficacy`,

  'Evidence': `EVIDENCE FOCUS - DESIGN DIRECTION:
• Dominant visual: Scientific/clinical data presentation
• Show clinical study results and p-values as hero content
• Use structured, authoritative visual flow
• Color emphasis: Professional, scientific palette
• Data visualization: Bar charts, statistical comparisons, study endpoints
• Metaphor suggestions: Scientific precision, proven results, guideline alignment
• Include: Study names, patient numbers, statistical significance markers`
};

// Helper to get display name for document
function getDocumentDisplayName(doc: Document): string {
  return (doc.name || doc.title || doc.brand_name || `Document ${doc.id.substring(0, 8)}`) as string;
}

function App() {
  // Document/Component state (replaces file upload)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [components, setComponents] = useState<ComponentData[]>([]);

  // Generation settings
  const [focusArea, setFocusArea] = useState('Efficacy');

  // Editable prompt state
  const [customPrompt, setCustomPrompt] = useState(() => {
    const saved = localStorage.getItem('lblCustomPrompt');
    return saved || DEFAULT_PROMPT;
  });
  const [showPromptEditor, setShowPromptEditor] = useState(false);

  // Reference images state (categorized)
  type ReferenceCategory = 'brand' | 'company' | 'campaign' | 'design';
  const [referenceImages, setReferenceImages] = useState<Record<ReferenceCategory, { id: string; base64: string; name: string }[]>>({
    brand: [],
    company: [],
    campaign: [],
    design: []
  });
  const [showReferenceUpload, setShowReferenceUpload] = useState(false);
  const [activeRefCategory, setActiveRefCategory] = useState<ReferenceCategory>('design');

  // Theme prompts state
  const [themePrompts, setThemePrompts] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('lblThemePrompts');
    return saved ? JSON.parse(saved) : DEFAULT_THEME_PROMPTS;
  });
  const [showThemePrompts, setShowThemePrompts] = useState(false);
  const [activeThemeTab, setActiveThemeTab] = useState('Efficacy');

  // Selected components per focus area
  const [selectedComponents, setSelectedComponents] = useState<Record<string, Set<ComponentId>>>(() => {
    const saved = localStorage.getItem('lblSelectedComponents');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Convert arrays back to Sets
      return Object.fromEntries(
        Object.entries(parsed).map(([k, v]) => [k, new Set(v as ComponentId[])])
      ) as Record<string, Set<ComponentId>>;
    }
    return Object.fromEntries(
      Object.entries(DEFAULT_SELECTED_COMPONENTS).map(([k, v]) => [k, new Set(v)])
    ) as Record<string, Set<ComponentId>>;
  });
  const [showComponentSelection, setShowComponentSelection] = useState(false);

  // Output state - single image
  const [generatedImage, setGeneratedImage] = useState<{ image: string; mimeType: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [_isExtracting, setIsExtracting] = useState(false); // Used for future UI enhancement
  const [extractionProgress, setExtractionProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [overlayStatus, setOverlayStatus] = useState<string | null>(null);

  // Prompt preview state
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [previewPrompt, setPreviewPrompt] = useState<string>('');

  // UI state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('lblDarkMode');
    return saved ? JSON.parse(saved) : false;
  });

  // Save custom prompt to localStorage
  useEffect(() => {
    localStorage.setItem('lblCustomPrompt', customPrompt);
  }, [customPrompt]);

  // Save theme prompts to localStorage
  useEffect(() => {
    localStorage.setItem('lblThemePrompts', JSON.stringify(themePrompts));
  }, [themePrompts]);

  // Save selected components to localStorage (convert Sets to arrays)
  useEffect(() => {
    const toSave = Object.fromEntries(
      Object.entries(selectedComponents).map(([k, v]) => [k, Array.from(v)])
    );
    localStorage.setItem('lblSelectedComponents', JSON.stringify(toSave));
  }, [selectedComponents]);

  useEffect(() => {
    localStorage.setItem('lblDarkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  // Handle document selection from Supabase
  const handleDocumentSelect = useCallback((doc: Document, docComponents: ComponentData[]) => {
    setSelectedDocument(doc);
    setComponents(docComponents);
    setError(null);
    setGeneratedImage(null);
  }, []);

  // Handle reference image upload (to active category)
  const handleReferenceUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>, category: ReferenceCategory) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setReferenceImages(prev => ({
          ...prev,
          [category]: [
            ...prev[category],
            { id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`, base64, name: file.name }
          ]
        }));
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    e.target.value = '';
  }, []);

  // Remove reference image from a category
  const removeReferenceImage = useCallback((category: ReferenceCategory, id: string) => {
    setReferenceImages(prev => ({
      ...prev,
      [category]: prev[category].filter(img => img.id !== id)
    }));
  }, []);

  // Get total reference image count
  const getTotalRefImages = useCallback(() => {
    return Object.values(referenceImages).reduce((sum, arr) => sum + arr.length, 0);
  }, [referenceImages]);

  // Toggle component selection for a focus area
  const toggleComponent = useCallback((focusArea: string, componentId: ComponentId) => {
    setSelectedComponents(prev => {
      const currentSet = prev[focusArea] || new Set();
      const newSet = new Set(currentSet);
      if (newSet.has(componentId)) {
        newSet.delete(componentId);
      } else {
        newSet.add(componentId);
      }
      return { ...prev, [focusArea]: newSet };
    });
  }, []);

  // Reset components to default for a focus area
  const resetComponentsToDefault = useCallback((focusArea: string) => {
    setSelectedComponents(prev => ({
      ...prev,
      [focusArea]: new Set(DEFAULT_SELECTED_COMPONENTS[focusArea] || [])
    }));
  }, []);

  // Generate prompt preview (text only)
  const handleGeneratePrompt = useCallback(() => {
    if (!selectedDocument || components.length === 0) {
      setError('Please select a document first.');
      return;
    }

    // Build the extracted content from components
    const extractedContent = buildPromptFromComponents(components, focusArea);
    const themePrompt = themePrompts[focusArea] || DEFAULT_THEME_PROMPTS[focusArea];

    // Build reference images summary
    const refSummary = `
================================================================================
REFERENCE IMAGES (Step 7)
================================================================================
• Brand Reference: ${referenceImages.brand.length} image(s)${referenceImages.brand.map(img => `\n  - ${img.name}`).join('')}
• Company Reference: ${referenceImages.company.length} image(s)${referenceImages.company.map(img => `\n  - ${img.name}`).join('')}
• Campaign Reference: ${referenceImages.campaign.length} image(s)${referenceImages.campaign.map(img => `\n  - ${img.name}`).join('')}
• Design Reference: ${referenceImages.design.length} image(s)${referenceImages.design.map(img => `\n  - ${img.name}`).join('')}

Total: ${getTotalRefImages()} reference image(s) will be sent with this prompt`;

    // Build the full prompt exactly as it would be sent to the API
    const fullPrompt = `${customPrompt}

=== FOCUS AREA: ${focusArea.toUpperCase()} ===

${themePrompt}

=== PRODUCT DATA (from components) ===
${extractedContent}
${refSummary}`;

    setPreviewPrompt(fullPrompt);
    setShowPromptPreview(true);
  }, [selectedDocument, components, focusArea, customPrompt, themePrompts, referenceImages, getTotalRefImages]);

  // Generate LBL from components
  const handleGenerate = useCallback(async () => {
    if (!selectedDocument || components.length === 0) {
      setError('Please select a document first.');
      return;
    }

    if (!isApiConfigured()) {
      setError('API key not configured. Please set VITE_GEMINI_API_KEY in your .env file.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);
    setOverlayStatus(null);
    setExtractionProgress(null);

    try {
      const companyName = (selectedDocument.company_name || 'pharma') as string;
      const brandName = (selectedDocument.brand_name || selectedDocument.name || 'product') as string;

      // STEP 1: Extract content from component images
      setIsExtracting(true);
      setExtractionProgress('Step 1: Extracting content from components...');

      let enrichedComponents = components;

      // Check if any components have images but no content
      const needsExtraction = components.some(c => c.image_base64 && !c.content);

      if (needsExtraction) {
        enrichedComponents = await extractAllContent(
          components,
          (done, total, current) => {
            setExtractionProgress(`Extracting ${current}... (${done}/${total})`);
          }
        );

        // Log extraction summary
        const summary = getExtractionSummary(enrichedComponents);
        console.log('Content extraction complete:', summary);
      }

      setIsExtracting(false);
      setExtractionProgress('Step 2: Building prompt...');

      // STEP 2: Use custom prompt + theme prompt + extracted content
      const extractedContent = buildPromptFromComponents(enrichedComponents, focusArea);
      const themePrompt = themePrompts[focusArea] || DEFAULT_THEME_PROMPTS[focusArea];
      const finalPrompt = `${customPrompt}

=== FOCUS AREA: ${focusArea.toUpperCase()} ===

${themePrompt}

=== PRODUCT DATA (from components) ===
${extractedContent}`;

      // Build labeled content with properly separated logos and design references
      const labeledContent = buildApiContent(finalPrompt, enrichedComponents);

      // Collect all categorized reference images
      const totalRefImages = getTotalRefImages();
      setExtractionProgress(`Step 3: Generating LBL with AI${totalRefImages > 0 ? ` + ${totalRefImages} reference images` : ''}...`);

      // STEP 3: Combine all user-uploaded reference images with labels
      const allUserReferences: string[] = [];

      // Add brand references
      if (referenceImages.brand.length > 0) {
        referenceImages.brand.forEach(img => allUserReferences.push(img.base64));
      }
      // Add company references
      if (referenceImages.company.length > 0) {
        referenceImages.company.forEach(img => allUserReferences.push(img.base64));
      }
      // Add campaign references
      if (referenceImages.campaign.length > 0) {
        referenceImages.campaign.forEach(img => allUserReferences.push(img.base64));
      }
      // Add design references
      if (referenceImages.design.length > 0) {
        referenceImages.design.forEach(img => allUserReferences.push(img.base64));
      }

      const result = await generateImage({
        prompt: finalPrompt,
        company: companyName.toLowerCase(),
        brand: brandName.toLowerCase(),
        labeledContent,
        referenceImages: allUserReferences.length > 0 ? allUserReferences : undefined,
        includeDesignReferences: allUserReferences.length === 0, // Only use local if no user uploads
        aspectRatio: '16:9',
      });

      let finalImage = result.imageBase64;

      // Apply logo overlay (brand=left, company=right)
      setOverlayStatus('Overlaying logos...');
      try {
        finalImage = await overlayLogos(finalImage, components, {
          companyLogoPosition: 'top-right',
          brandLogoPosition: 'top-left',
          logoMaxWidthPercent: 12,
          logoMaxHeightPercent: 15,
          padding: 25,
        });
        setOverlayStatus('LBL generated successfully!');
      } catch (logoErr) {
        console.warn('Logo overlay failed:', logoErr);
        setOverlayStatus('Generated (logo overlay skipped)');
      }

      setGeneratedImage({
        image: finalImage,
        mimeType: result.mimeType,
      });
    } catch (err) {
      console.error('Error generating image:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate image. Please try again.');
    } finally {
      setIsLoading(false);
      setIsExtracting(false);
      setExtractionProgress(null);
    }
  }, [selectedDocument, components, focusArea, customPrompt, referenceImages, themePrompts]);

  const canGenerate = selectedDocument && components.length > 0 && !isLoading;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-10 border-b transition-colors duration-300 ${
        isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-sm transition-colors duration-300 ${
                isDarkMode
                  ? 'bg-gradient-to-br from-indigo-500 to-purple-600'
                  : 'bg-gradient-to-br from-indigo-600 to-indigo-700'
              }`}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className={`text-xl font-semibold tracking-tight transition-colors duration-300 ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  LBL Generator
                </h1>
                <p className={`text-xs transition-colors duration-300 ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  Component-Based Asset Creator
                </p>
              </div>
            </button>
            <span className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors duration-300 ${
              isDarkMode
                ? 'text-indigo-300 bg-indigo-900/50'
                : 'text-indigo-700 bg-indigo-50'
            }`}>
              v2.0
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* API Warning */}
        {!isApiConfigured() && (
          <div className={`mb-6 p-4 rounded-lg border transition-colors duration-300 ${
            isDarkMode
              ? 'bg-amber-900/20 border-amber-800'
              : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-start gap-3">
              <svg className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isDarkMode ? 'text-amber-400' : 'text-amber-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className={`text-sm font-medium ${isDarkMode ? 'text-amber-300' : 'text-amber-800'}`}>Configuration Required</p>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                  Add <code className={`px-1.5 py-0.5 rounded text-xs font-mono ${isDarkMode ? 'bg-amber-900/50' : 'bg-amber-100'}`}>VITE_GEMINI_API_KEY</code>,{' '}
                  <code className={`px-1.5 py-0.5 rounded text-xs font-mono ${isDarkMode ? 'bg-amber-900/50' : 'bg-amber-100'}`}>VITE_SUPABASE_URL</code>, and{' '}
                  <code className={`px-1.5 py-0.5 rounded text-xs font-mono ${isDarkMode ? 'bg-amber-900/50' : 'bg-amber-100'}`}>VITE_SUPABASE_ANON_KEY</code> to .env
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* LEFT COLUMN - Fixed/Reference Content */}
          <div className="space-y-6">
            {/* Product Selection */}
            <div className={`rounded-xl border shadow-sm overflow-hidden transition-colors duration-300 ${
              isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
            }`}>
              <div className={`px-6 py-4 border-b transition-colors duration-300 ${
                isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'
              }`}>
                <h2 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Select Product
                </h2>
                <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Load components from repository
                </p>
              </div>
              <div className="p-6">
                <ProductSelect
                  onProductSelect={handleDocumentSelect}
                  isDarkMode={isDarkMode}
                />
              </div>
            </div>

            {/* Fixed Reference Prompt (Read-only) */}
            <div className={`rounded-xl border shadow-sm overflow-hidden transition-colors duration-300 ${
              isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
            }`}>
              <div className={`px-6 py-4 border-b transition-colors duration-300 ${
                isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'
              }`}>
                <h2 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Reference Prompt (Read-only)
                </h2>
                <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Full prompt structure for reference
                </p>
              </div>
              <div className="p-6">
                <pre className={`w-full p-4 rounded-lg border text-xs font-mono overflow-auto max-h-[600px] whitespace-pre-wrap ${
                  isDarkMode
                    ? 'bg-slate-900 border-slate-600 text-slate-300'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  {FIXED_REFERENCE_PROMPT}
                </pre>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN - Editable Options */}
          <div className="space-y-6">
            {/* Generation Settings */}
            <div className={`rounded-xl border shadow-sm overflow-hidden transition-colors duration-300 ${
              isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
            }`}>
              <div className={`px-6 py-4 border-b transition-colors duration-300 ${
                isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'
              }`}>
                <h2 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Generation Settings
                </h2>
                <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Configure output parameters
                </p>
              </div>
              <div className="p-6">
                {/* Selected Document Info */}
                {selectedDocument ? (
                  <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-indigo-900/30' : 'bg-indigo-50'}`}>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>
                      {getDocumentDisplayName(selectedDocument)}
                    </p>
                    <p className={`text-xs ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                      {components.length} components loaded
                    </p>
                  </div>
                ) : (
                  <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    No document selected. Please select a product above.
                  </p>
                )}
              </div>
            </div>

            {/* General Prompt - Editable */}
            <div className={`rounded-xl border shadow-sm overflow-hidden transition-colors duration-300 ${
              isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
            }`}>
              <button
                onClick={() => setShowPromptEditor(!showPromptEditor)}
                className={`w-full px-6 py-4 border-b transition-colors duration-300 flex items-center justify-between ${
                  isDarkMode ? 'border-slate-700 bg-slate-800/50 hover:bg-slate-700/50' : 'border-slate-100 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className="text-left">
                  <h2 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    General Prompt - Editable
                  </h2>
                  <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {showPromptEditor ? 'Click to collapse' : 'Main prompt template with ${variables}'}
                  </p>
                </div>
                <svg
                  className={`w-5 h-5 transition-transform ${showPromptEditor ? 'rotate-180' : ''} ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showPromptEditor && (
                <div className="p-6 space-y-4">
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    rows={15}
                    className={`w-full p-3 rounded-lg border text-sm font-mono resize-y transition-colors duration-300 ${
                      isDarkMode
                        ? 'bg-slate-900 border-slate-600 text-slate-200 placeholder-slate-500 focus:border-indigo-500'
                        : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400 focus:border-indigo-500'
                    } focus:outline-none focus:ring-2 focus:ring-indigo-500/20`}
                    placeholder="Enter your custom prompt..."
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCustomPrompt(DEFAULT_PROMPT)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        isDarkMode
                          ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Reset to Default
                    </button>
                    <span className={`px-3 py-1.5 text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      {customPrompt.length} characters
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Focus Area Prompt - Editable */}
            <div className={`rounded-xl border shadow-sm overflow-hidden transition-colors duration-300 ${
              isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
            }`}>
              <button
                onClick={() => setShowThemePrompts(!showThemePrompts)}
                className={`w-full px-6 py-4 border-b transition-colors duration-300 flex items-center justify-between ${
                  isDarkMode ? 'border-slate-700 bg-slate-800/50 hover:bg-slate-700/50' : 'border-slate-100 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className="text-left">
                  <h2 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Focus Area Prompt - Editable
                    <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                      isDarkMode ? 'bg-indigo-900/50 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
                    }`}>
                      {focusArea}
                    </span>
                  </h2>
                  <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {showThemePrompts ? 'Click to collapse' : 'Select focus area & edit design direction'}
                  </p>
                </div>
                <svg
                  className={`w-5 h-5 transition-transform ${showThemePrompts ? 'rotate-180' : ''} ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showThemePrompts && (
                <div className="p-6 space-y-4">
                  {/* Focus Area Selection & Theme Tabs */}
                  <div>
                    <label className={`block text-xs font-medium mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Select Focus Area for Generation
                    </label>
                    <div className="flex gap-2">
                      {['Efficacy', 'Safety', 'Evidence'].map((theme) => (
                        <button
                          key={theme}
                          onClick={() => {
                            setActiveThemeTab(theme);
                            setFocusArea(theme);
                          }}
                          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                            focusArea === theme
                              ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-2 ' + (isDarkMode ? 'ring-offset-slate-800' : 'ring-offset-white')
                              : isDarkMode
                                ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {theme}
                          {focusArea === theme && (
                            <span className="ml-1.5">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Theme Prompt Textarea */}
                  <div>
                    <label className={`block text-xs font-medium mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Editing: {activeThemeTab} Design Direction
                    </label>
                  </div>
                  <textarea
                    value={themePrompts[activeThemeTab] || ''}
                    onChange={(e) => setThemePrompts(prev => ({ ...prev, [activeThemeTab]: e.target.value }))}
                    rows={10}
                    className={`w-full p-3 rounded-lg border text-sm font-mono resize-y transition-colors duration-300 ${
                      isDarkMode
                        ? 'bg-slate-900 border-slate-600 text-slate-200 placeholder-slate-500 focus:border-indigo-500'
                        : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400 focus:border-indigo-500'
                    } focus:outline-none focus:ring-2 focus:ring-indigo-500/20`}
                    placeholder={`Enter ${activeThemeTab} theme prompt...`}
                  />

                  <div className="flex gap-2 flex-wrap items-center">
                    <button
                      onClick={() => setThemePrompts(prev => ({ ...prev, [activeThemeTab]: DEFAULT_THEME_PROMPTS[activeThemeTab] }))}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        isDarkMode
                          ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Reset {activeThemeTab}
                    </button>
                    <button
                      onClick={() => setThemePrompts(DEFAULT_THEME_PROMPTS)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        isDarkMode
                          ? 'bg-amber-900/30 text-amber-300 hover:bg-amber-900/50'
                          : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                      }`}
                    >
                      Reset All Themes
                    </button>
                    <span className={`px-3 py-1.5 text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      {(themePrompts[activeThemeTab] || '').length} characters
                    </span>
                    <span className={`ml-auto px-3 py-1.5 text-xs flex items-center gap-1 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Auto-saved
                    </span>
                  </div>

                  {/* Component Selection */}
                  <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <button
                      onClick={() => setShowComponentSelection(!showComponentSelection)}
                      className={`w-full flex items-center justify-between py-2`}
                    >
                      <div>
                        <h3 className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          Component Selection
                          <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                            isDarkMode ? 'bg-indigo-900/50 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
                          }`}>
                            {(selectedComponents[focusArea] || new Set()).size} selected
                          </span>
                        </h3>
                        <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {showComponentSelection ? 'Click to collapse' : 'Select components to include in LBL'}
                        </p>
                      </div>
                      <svg
                        className={`w-5 h-5 transition-transform ${showComponentSelection ? 'rotate-180' : ''} ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {showComponentSelection && (
                      <div className="mt-4 space-y-4">
                        {/* Reset to default button */}
                        <button
                          onClick={() => resetComponentsToDefault(focusArea)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            isDarkMode
                              ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Reset to Default ({focusArea})
                        </button>

                        {/* Component list grouped by section */}
                        <div className={`max-h-80 overflow-y-auto rounded-lg border ${
                          isDarkMode ? 'border-slate-600 bg-slate-900/50' : 'border-slate-200 bg-slate-50'
                        }`}>
                          {(['INIT', 'INS', 'SOL', 'EVID', 'SAFE', 'SERV', 'COMM', 'REG'] as const).map(section => {
                            // Get all component IDs for this section
                            const sectionComponentIds = Object.entries(COMPONENT_METADATA)
                              .filter(([_, meta]) => meta.section === section)
                              .map(([id]) => id as ComponentId);

                            if (sectionComponentIds.length === 0) return null;

                            // Section names mapping
                            const sectionNames: Record<string, string> = {
                              'INIT': 'Brand',
                              'INS': 'Insight',
                              'SOL': 'Solution',
                              'EVID': 'Evidence',
                              'SAFE': 'Safety',
                              'SERV': 'Services',
                              'COMM': 'Commerce',
                              'REG': 'Regulatory'
                            };

                            return (
                              <div key={section} className={`border-b last:border-b-0 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                                <div className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider ${
                                  isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {sectionNames[section]} ({section})
                                </div>
                                <div className="p-2 space-y-1">
                                  {sectionComponentIds.map(compId => {
                                    const meta = COMPONENT_METADATA[compId];
                                    const isSelected = (selectedComponents[focusArea] || new Set()).has(compId);
                                    // Find the component data to get extracted value
                                    const compData = components.find(c => c.component_id === compId);
                                    const extractedValue = compData?.content;

                                    return (
                                      <label
                                        key={compId}
                                        className={`flex items-start gap-2 p-2 rounded cursor-pointer transition-colors ${
                                          isSelected
                                            ? isDarkMode
                                              ? 'bg-indigo-900/30'
                                              : 'bg-indigo-50'
                                            : isDarkMode
                                              ? 'hover:bg-slate-800'
                                              : 'hover:bg-slate-100'
                                        }`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => toggleComponent(focusArea, compId)}
                                          className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <span className={`text-sm font-medium ${
                                              isDarkMode ? 'text-slate-200' : 'text-slate-700'
                                            }`}>
                                              {meta.name}
                                            </span>
                                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                                              meta.criticality === 'MANDATORY'
                                                ? isDarkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-700'
                                                : meta.criticality === 'CORE'
                                                  ? isDarkMode ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-100 text-amber-700'
                                                  : isDarkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-600'
                                            }`}>
                                              {meta.criticality}
                                            </span>
                                          </div>
                                          {extractedValue ? (
                                            <p className={`text-xs mt-0.5 truncate ${
                                              isDarkMode ? 'text-indigo-300' : 'text-indigo-600'
                                            }`}>
                                              "{extractedValue.substring(0, 60)}{extractedValue.length > 60 ? '...' : ''}"
                                            </p>
                                          ) : compData?.image_base64 ? (
                                            <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                              [Image available]
                                            </p>
                                          ) : (
                                            <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>
                                              [No data]
                                            </p>
                                          )}
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Reference Images Upload - Categorized (Step 7) */}
            <div className={`rounded-xl border shadow-sm overflow-hidden transition-colors duration-300 ${
              isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
            }`}>
              <button
                onClick={() => setShowReferenceUpload(!showReferenceUpload)}
                className={`w-full px-6 py-4 border-b transition-colors duration-300 flex items-center justify-between ${
                  isDarkMode ? 'border-slate-700 bg-slate-800/50 hover:bg-slate-700/50' : 'border-slate-100 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className="text-left">
                  <h2 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Reference Images (Step 7)
                    {getTotalRefImages() > 0 && (
                      <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                        isDarkMode ? 'bg-indigo-900/50 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        {getTotalRefImages()}
                      </span>
                    )}
                  </h2>
                  <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {showReferenceUpload ? 'Click to collapse' : 'Brand, Company, Campaign, Design references'}
                  </p>
                </div>
                <svg
                  className={`w-5 h-5 transition-transform ${showReferenceUpload ? 'rotate-180' : ''} ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showReferenceUpload && (
                <div className="p-6 space-y-4">
                  {/* Category Tabs */}
                  <div className="flex gap-2 flex-wrap">
                    {([
                      { key: 'brand' as ReferenceCategory, label: 'Brand', icon: '🏷️' },
                      { key: 'company' as ReferenceCategory, label: 'Company', icon: '🏢' },
                      { key: 'campaign' as ReferenceCategory, label: 'Campaign', icon: '📣' },
                      { key: 'design' as ReferenceCategory, label: 'Design', icon: '🎨' },
                    ]).map(cat => (
                      <button
                        key={cat.key}
                        onClick={() => setActiveRefCategory(cat.key)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                          activeRefCategory === cat.key
                            ? 'bg-indigo-600 text-white'
                            : isDarkMode
                              ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <span>{cat.icon}</span>
                        {cat.label}
                        {referenceImages[cat.key].length > 0 && (
                          <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                            activeRefCategory === cat.key
                              ? 'bg-indigo-500 text-white'
                              : isDarkMode
                                ? 'bg-slate-600 text-slate-300'
                                : 'bg-slate-200 text-slate-600'
                          }`}>
                            {referenceImages[cat.key].length}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Upload Area for Active Category */}
                  <label className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    isDarkMode
                      ? 'border-slate-600 hover:border-indigo-500 bg-slate-900/50 hover:bg-slate-900'
                      : 'border-slate-300 hover:border-indigo-500 bg-slate-50 hover:bg-slate-100'
                  }`}>
                    <div className="flex flex-col items-center justify-center py-4">
                      <svg className={`w-7 h-7 mb-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Upload <span className="font-semibold capitalize">{activeRefCategory}</span> reference
                      </p>
                      <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>PNG, JPG</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/png,image/jpeg,image/jpg"
                      multiple
                      onChange={(e) => handleReferenceUpload(e, activeRefCategory)}
                    />
                  </label>

                  {/* Images for Active Category */}
                  {referenceImages[activeRefCategory].length > 0 && (
                    <div>
                      <p className={`text-xs font-medium mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {activeRefCategory.charAt(0).toUpperCase() + activeRefCategory.slice(1)} References ({referenceImages[activeRefCategory].length})
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        {referenceImages[activeRefCategory].map((img) => (
                          <div key={img.id} className="relative group">
                            <img
                              src={`data:image/png;base64,${img.base64}`}
                              alt={img.name}
                              className={`w-full h-20 object-cover rounded-lg border ${
                                isDarkMode ? 'border-slate-600' : 'border-slate-200'
                              }`}
                            />
                            <button
                              onClick={() => removeReferenceImage(activeRefCategory, img.id)}
                              className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                            >
                              ×
                            </button>
                            <p className={`text-xs truncate mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              {img.name}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Summary of all categories */}
                  <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                    <p className={`text-xs font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      Reference Summary
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className={`flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        <span>🏷️ Brand:</span>
                        <span className="font-medium">{referenceImages.brand.length}</span>
                      </div>
                      <div className={`flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        <span>🏢 Company:</span>
                        <span className="font-medium">{referenceImages.company.length}</span>
                      </div>
                      <div className={`flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        <span>📣 Campaign:</span>
                        <span className="font-medium">{referenceImages.campaign.length}</span>
                      </div>
                      <div className={`flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        <span>🎨 Design:</span>
                        <span className="font-medium">{referenceImages.design.length}</span>
                      </div>
                    </div>
                    <p className={`text-xs mt-2 pt-2 border-t ${isDarkMode ? 'border-slate-700 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
                      Total: {getTotalRefImages()} image(s) · {getTotalRefImages() === 0 ? 'Default references will be used' : 'Will be sent with prompt'}
                    </p>
                  </div>

                  {/* Clear All */}
                  {getTotalRefImages() > 0 && (
                    <button
                      onClick={() => setReferenceImages({ brand: [], company: [], campaign: [], design: [] })}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        isDarkMode
                          ? 'bg-red-900/30 text-red-300 hover:bg-red-900/50'
                          : 'bg-red-50 text-red-600 hover:bg-red-100'
                      }`}
                    >
                      Clear All References
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleGeneratePrompt}
                disabled={!selectedDocument || components.length === 0}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                  !selectedDocument || components.length === 0
                    ? isDarkMode
                      ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : isDarkMode
                      ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Generate Prompt
              </button>
              <GenerateButton
                onClick={handleGenerate}
                disabled={!canGenerate}
                isLoading={isLoading}
                isDarkMode={isDarkMode}
              />
            </div>

            {/* Prompt Preview Panel */}
            {showPromptPreview && (
              <div className={`rounded-xl border shadow-sm overflow-hidden transition-colors duration-300 ${
                isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
              }`}>
                <div className={`px-6 py-4 border-b transition-colors duration-300 flex items-center justify-between ${
                  isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'
                }`}>
                  <div>
                    <h2 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      Full Prompt Preview
                      <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                        isDarkMode ? 'bg-indigo-900/50 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        {focusArea}
                      </span>
                    </h2>
                    <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Text-only prompt sent to NanoBanana Pro (Gemini)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(previewPrompt);
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        isDarkMode
                          ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => setShowPromptPreview(false)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isDarkMode
                          ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <pre className={`w-full p-4 rounded-lg border text-xs font-mono overflow-auto max-h-[500px] whitespace-pre-wrap ${
                    isDarkMode
                      ? 'bg-slate-900 border-slate-600 text-slate-300'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}>
                    {previewPrompt}
                  </pre>
                  <p className={`mt-3 text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    {previewPrompt.length.toLocaleString()} characters · Images (logos, references) are sent separately
                  </p>
                </div>
              </div>
            )}

            {/* Output Section */}
            <div className={`rounded-xl border shadow-sm overflow-hidden transition-colors duration-300 ${
              isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
            }`}>
              <div className={`px-6 py-4 border-b transition-colors duration-300 ${
                isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      Generated Output
                    </h2>
                    <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {isLoading
                        ? 'Generating LBL...'
                        : generatedImage
                        ? 'LBL generated'
                        : 'Your LBL will appear here'}
                    </p>
                  </div>
                  {generatedImage && (
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      isDarkMode ? 'bg-indigo-900/50 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
                    }`}>
                      {focusArea}
                    </span>
                  )}
                </div>
              </div>
              <div className="p-6">
                {/* Extraction/Generation Progress */}
                {isLoading && extractionProgress && (
                  <div className={`mb-4 p-3 rounded-lg text-sm ${
                    isDarkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-700'
                  }`}>
                    <div className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {extractionProgress}
                    </div>
                  </div>
                )}

                {/* Overlay Status Message */}
                {overlayStatus && !isLoading && (
                  <div className={`mb-4 p-3 rounded-lg text-sm ${
                    overlayStatus.includes('successfully') || overlayStatus.includes('generated')
                      ? isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-50 text-green-700'
                      : isDarkMode ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {overlayStatus}
                  </div>
                )}

                <ImageOutput
                  imageData={generatedImage?.image || null}
                  mimeType={generatedImage?.mimeType || 'image/png'}
                  isLoading={isLoading}
                  error={error}
                  isDarkMode={isDarkMode}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
