import { useState, useCallback, useEffect } from 'react';
import { ProductSelect } from './components/ProductSelect';
import { FocusAreaSelect } from './components/FocusAreaSelect';
import { ImageOutput } from './components/ImageOutput';
import { GenerateButton } from './components/GenerateButton';
import { generateImage, isApiConfigured } from './services/nanoBananaService';
import { overlayLogos } from './services/logoOverlayService';
import { extractAllContent, getExtractionSummary } from './services/contentExtractorService';
import type { ComponentData, Document } from './services/componentService';
import { buildPromptFromComponents, buildApiContent } from './utils/promptBuilder';

// Default prompt template
const DEFAULT_PROMPT = `You are generating a high-fidelity, print-ready pharmaceutical Leave Behind Leaflet (LBL) for medical professionals.

CANVAS: Landscape, 2560x1440, print-ready quality

BRANDING:
• DO NOT include any logos - they will be added in post-processing
• LEAVE TOP-LEFT corner EMPTY for brand logo
• LEAVE TOP-RIGHT corner EMPTY for company logo
• Use brand colors from the reference images

DESIGN:
• Modern pharmaceutical infographic style
• Professional, editorial-grade (NOT PowerPoint)
• Clear visual hierarchy
• Abstract scientific motifs allowed

FORBIDDEN:
• No logos (added later)
• No bullet lists
• No boxed content panels
• No PowerPoint-style layouts

REGULATORY FOOTER:
For the use of a Registered Medical Practitioner, Hospital, or Laboratory only

Generate ONE final image only.`;

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

  // Reference images state
  const [referenceImages, setReferenceImages] = useState<{ id: string; base64: string; name: string }[]>([]);
  const [showReferenceUpload, setShowReferenceUpload] = useState(false);

  // Theme prompts state
  const [themePrompts, setThemePrompts] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('lblThemePrompts');
    return saved ? JSON.parse(saved) : DEFAULT_THEME_PROMPTS;
  });
  const [showThemePrompts, setShowThemePrompts] = useState(false);
  const [activeThemeTab, setActiveThemeTab] = useState('Efficacy');

  // Output state - single image
  const [generatedImage, setGeneratedImage] = useState<{ image: string; mimeType: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [_isExtracting, setIsExtracting] = useState(false); // Used for future UI enhancement
  const [extractionProgress, setExtractionProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [overlayStatus, setOverlayStatus] = useState<string | null>(null);

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

  // Handle reference image upload
  const handleReferenceUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setReferenceImages(prev => [
          ...prev,
          { id: `ref-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, base64, name: file.name }
        ]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    e.target.value = '';
  }, []);

  // Remove reference image
  const removeReferenceImage = useCallback((id: string) => {
    setReferenceImages(prev => prev.filter(img => img.id !== id));
  }, []);

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

      setExtractionProgress(`Step 3: Generating LBL with AI${referenceImages.length > 0 ? ` + ${referenceImages.length} reference images` : ''}...`);

      // STEP 3: Generate image with user-uploaded reference images (if any)
      const userReferenceBase64 = referenceImages.map(img => img.base64);

      const result = await generateImage({
        prompt: finalPrompt,
        company: companyName.toLowerCase(),
        brand: brandName.toLowerCase(),
        labeledContent,
        referenceImages: userReferenceBase64.length > 0 ? userReferenceBase64 : undefined,
        includeDesignReferences: userReferenceBase64.length === 0, // Only use local if no user uploads
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

        <div className="space-y-8">
          {/* Input Section */}
          <div className="space-y-6">
            {/* Product Selection (replaces File Upload) */}
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
              <div className="p-6 space-y-5">
                {/* Selected Document Info */}
                {selectedDocument && (
                  <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-indigo-900/30' : 'bg-indigo-50'}`}>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>
                      {getDocumentDisplayName(selectedDocument)}
                    </p>
                    <p className={`text-xs ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                      {components.length} components loaded
                    </p>
                  </div>
                )}

                <FocusAreaSelect
                  value={focusArea}
                  onChange={setFocusArea}
                  isDarkMode={isDarkMode}
                />
              </div>
            </div>

            {/* Prompt Editor */}
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
                    Prompt Editor
                  </h2>
                  <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {showPromptEditor ? 'Click to collapse' : 'Click to edit AI prompt'}
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

            {/* Theme Prompts Editor */}
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
                    Theme Prompts
                  </h2>
                  <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {showThemePrompts ? 'Click to collapse' : 'Edit prompts for Efficacy, Safety, Evidence'}
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
                  {/* Theme Tabs */}
                  <div className="flex gap-2">
                    {['Efficacy', 'Safety', 'Evidence'].map((theme) => (
                      <button
                        key={theme}
                        onClick={() => setActiveThemeTab(theme)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                          activeThemeTab === theme
                            ? isDarkMode
                              ? 'bg-indigo-600 text-white'
                              : 'bg-indigo-600 text-white'
                            : isDarkMode
                              ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {theme}
                      </button>
                    ))}
                  </div>

                  {/* Theme Prompt Textarea */}
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

                  <div className="flex gap-2 flex-wrap">
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
                  </div>
                </div>
              )}
            </div>

            {/* Reference Images Upload */}
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
                    Reference Images
                    {referenceImages.length > 0 && (
                      <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                        isDarkMode ? 'bg-indigo-900/50 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        {referenceImages.length}
                      </span>
                    )}
                  </h2>
                  <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {showReferenceUpload ? 'Click to collapse' : 'Upload design reference images'}
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
                  {/* Upload Area */}
                  <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    isDarkMode
                      ? 'border-slate-600 hover:border-indigo-500 bg-slate-900/50 hover:bg-slate-900'
                      : 'border-slate-300 hover:border-indigo-500 bg-slate-50 hover:bg-slate-100'
                  }`}>
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg className={`w-8 h-8 mb-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        <span className="font-semibold">Click to upload</span> reference images
                      </p>
                      <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>PNG, JPG (max 10 images)</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/png,image/jpeg,image/jpg"
                      multiple
                      onChange={handleReferenceUpload}
                      disabled={referenceImages.length >= 10}
                    />
                  </label>

                  {/* Uploaded Images Grid */}
                  {referenceImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-3">
                      {referenceImages.map((img) => (
                        <div key={img.id} className="relative group">
                          <img
                            src={`data:image/png;base64,${img.base64}`}
                            alt={img.name}
                            className={`w-full h-20 object-cover rounded-lg border ${
                              isDarkMode ? 'border-slate-600' : 'border-slate-200'
                            }`}
                          />
                          <button
                            onClick={() => removeReferenceImage(img.id)}
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
                  )}

                  {/* Info */}
                  <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    {referenceImages.length === 0
                      ? 'No reference images uploaded. Default references will be used.'
                      : `${referenceImages.length}/10 images uploaded. These will be used as design references.`}
                  </p>

                  {/* Clear All */}
                  {referenceImages.length > 0 && (
                    <button
                      onClick={() => setReferenceImages([])}
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

            <GenerateButton
              onClick={handleGenerate}
              disabled={!canGenerate}
              isLoading={isLoading}
              isDarkMode={isDarkMode}
            />
          </div>

          {/* Output Section */}
          <div className="space-y-6">
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
