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
      setExtractionProgress('Step 2: Building prompt with extracted content...');

      // STEP 2: Build prompt with focus area using extracted content
      const prompt = buildPromptFromComponents(enrichedComponents, focusArea);

      // Build labeled content with properly separated logos and design references
      const labeledContent = buildApiContent(prompt, enrichedComponents);

      setExtractionProgress('Step 3: Generating LBL with AI + reference images...');

      // STEP 3: Generate image (reference images from /reference folder are added automatically)
      const result = await generateImage({
        prompt,
        company: companyName.toLowerCase(),
        brand: brandName.toLowerCase(),
        labeledContent,
        includeDesignReferences: true, // Include reference folder images
        aspectRatio: '16:9',
      });

      let finalImage = result.imageBase64;

      // Apply logo overlay
      setOverlayStatus('Overlaying logos...');
      try {
        finalImage = await overlayLogos(finalImage, components, {
          companyLogoPosition: 'top-left',
          brandLogoPosition: 'top-right',
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
  }, [selectedDocument, components, focusArea]);

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
          {/* Left Panel - Input */}
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

            <GenerateButton
              onClick={handleGenerate}
              disabled={!canGenerate}
              isLoading={isLoading}
              isDarkMode={isDarkMode}
            />
          </div>

          {/* Right Panel - Output */}
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

      {/* Footer */}
      <footer className={`border-t mt-auto transition-colors duration-300 ${
        isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className={`text-xs text-center ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            LBL Generator v2.0 &middot; Component-Based &middot; Powered by SOMA 53 Components
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
