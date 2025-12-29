import { useState, useCallback, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { LanguageSelect } from './components/LanguageSelect';
import { BrandSelect } from './components/BrandSelect';
import { ThemeSelect } from './components/ThemeSelect';
import { ImageOutput } from './components/ImageOutput';
import { GenerateButton } from './components/GenerateButton';
import { generateImage, isApiConfigured } from './services/nanoBananaService';
import { processFile } from './utils/pdfUtils';

const FIXED_PROMPT = `System Roles: Act as a Pharmaceutical Marketing Director, Medical Affairs Lead, Regulatory Compliance Officer (UCPMP 2025 Expert), and Senior Visual Designer. Task: Generate a high-fidelity, print-ready COMPLETELY NEW variation of the attached Leave Behind Leaflet (LBL). OUTPUT RESOLUTION: 2K Resolution (2560x1440 pixels minimum). Crystal clear, sharp, print-ready quality. 1. BRAND IDENTITY - COPY EXACT PIXELS (Non-Negotiable): Identify and COPY these elements EXACTLY as they appear in source: COMPANY LOGO: Usually top-right corner. Copy the exact logo with exact colors, exact icon, exact text, exact tagline. No distortion, no color change, no modification. Must be crisp and clear. BRAND NAME: The primary product name with its unique typography. Copy exact font styling, exact colors, exact letter arrangements, exact symbols (TM, R). If brand has special character styling (colored letters, unique fonts), copy exactly. BRAND VARIANT: Any suffix like dosage variants, formulation types. Copy exact styling. CAMPAIGN LOGO: If present (usually top-left), copy exactly with all colors and text intact. QR CODE: Copy exact QR code image. Must remain functional. BADGES AND CERTIFICATION MARKS: Any shield, badge, seal, award, or certification graphic that contains text. DO NOT regenerate. COPY the exact badge image pixel-for-pixel. PLUS/COMBINATION SYMBOLS: If products are shown in combination with "+" or "&", copy exact styling. RULE: These elements are trademark assets. They must appear IDENTICAL to source. 2. TEXT CONTENT - EXACT WORDING, CRYSTAL CLEAR: Extract and include ALL text from source with EXACT wording: - Main headline - Generic names and compositions - All claims and benefits with exact numbers and percentages - All superscript citations - Indication statements - Dosage information - Any other body text RULE: Every word must be spelled correctly and clearly readable. No garbled text. No random characters. 3. DISCLAIMER AND REGULATORY TEXT - USE PROVIDED TEXT: DO NOT extract disclaimer from source image. Instead, use this EXACT text in the bottom disclaimer area: "Ajaduo is a registered trademark owned by Boehringer Ingelheim International GmbH. Used under license." Additional required text: "For the use of a Registered Medical Practitioner or a Hospital or a Laboratory only" FORMAT REQUIREMENTS: - Clean, legible sans-serif font - Proper font size (readable but not dominant) - High contrast against background - Properly spaced and aligned - NO smudging, NO blur, NO garbled characters - Professional pharmaceutical footer styling 4. CHARACTER/PATIENT IMAGE - GENERATE NEW PERSON: DO NOT copy the human from source. Instead: Step 1: Analyze the character in source - note their age, gender, ethnicity, attire, pose, expression, context. Step 2: Generate a COMPLETELY NEW PERSON matching this description. Step 3: The new person should look DIFFERENT but fit the same role. RULE: Human characters must be freshly generated. New face, new person, same vibe. Single instance only. 5. DESIGN ELEMENTS - COMPLETE CREATIVE FREEDOM: Create COMPLETELY NEW design for: - Background: New colors, patterns, gradients, shapes - Icons: New style, new containers, new visual treatment - Layout: New arrangement of elements within same orientation - Color Palette: New harmonious scheme different from source - Decorative Elements: New borders, dividers, shapes - Typography: New fonts for non-brand text RULE: Design should look like a fresh campaign while maintaining brand identity. 6. QUALITY STANDARDS: - OUTPUT RESOLUTION: 2K (2560x1440 pixels minimum) - All elements must be SHARP and CRYSTAL CLEAR - All logos must be CRISP and HIGH-RESOLUTION - All badges must be SHARP with READABLE text - ALL TEXT must be LEGIBLE - no blurry, garbled, or random characters - Disclaimer text must be CLEAN, CLEAR, and PERFECTLY READABLE - No pixelation, no blur, no artifacts, no smudging - Print-ready professional quality 7. STRUCTURE RULES: - Company logo stays in original corner (usually top-right) - Campaign logo stays in original corner (usually top-left) - Brand name stays in upper/prominent area - Badges stay in similar position as source - Disclaimer stays at bottom in clean readable format - Same orientation as source (horizontal/vertical) 8. NEGATIVE CONSTRAINTS: NO modifying brand name font, colors, or styling NO distorting company logo NO regenerating badges with text - COPY them exactly NO changing QR code NO extracting disclaimer from source - use provided text only NO garbled, smudged, or unreadable text anywhere NO misspelled words NO blurry, pixelated, or low-quality output NO resolution below 2K NO keeping the same human character from source NO explanatory text - output ONLY the final image Output Goal: A 2K resolution, crystal clear, professional pharmaceutical LBL where BRAND IDENTITY is pixel-perfect, DISCLAIMER uses the provided clean text, HUMAN CHARACTER is freshly generated, and DESIGN is completely fresh. Output ONLY the final image.`;

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [language, setLanguage] = useState('English');
  const [brand, setBrand] = useState('glenmark');
  const [theme, setTheme] = useState('all');
  const [prompt] = useState(FIXED_PROMPT);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState('image/png');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('lblDarkMode');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('lblDarkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);

    try {
      const base64Images = await processFile(selectedFile);
      setReferenceImages(base64Images);
      const urls = base64Images.map(base64 => `data:image/jpeg;base64,${base64}`);
      setPreviewUrls(urls);
    } catch (err) {
      console.error('Error processing file:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to process file: ${errorMessage}`);
      setPreviewUrls([]);
      setReferenceImages([]);
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt.');
      return;
    }

    if (!isApiConfigured()) {
      setError('API key not configured. Please set VITE_GEMINI_API_KEY in your .env file.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const result = await generateImage({
        prompt: prompt.trim(),
        language,
        brand,
        theme,
        referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
      });

      setGeneratedImage(result.imageBase64);
      setImageMimeType(result.mimeType);
    } catch (err) {
      console.error('Error generating image:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [prompt, language, brand, theme, referenceImages]);

  const canGenerate = prompt.trim().length > 0 && !isLoading;

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
                  Pharmaceutical Marketing Asset Creator
                </p>
              </div>
            </button>
            <span className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors duration-300 ${
              isDarkMode
                ? 'text-indigo-300 bg-indigo-900/50'
                : 'text-indigo-700 bg-indigo-50'
            }`}>
              Powered by Gemini
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
                <p className={`text-sm font-medium ${isDarkMode ? 'text-amber-300' : 'text-amber-800'}`}>API Configuration Required</p>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                  Create a <code className={`px-1.5 py-0.5 rounded text-xs font-mono ${isDarkMode ? 'bg-amber-900/50' : 'bg-amber-100'}`}>.env</code> file with <code className={`px-1.5 py-0.5 rounded text-xs font-mono ${isDarkMode ? 'bg-amber-900/50' : 'bg-amber-100'}`}>VITE_GEMINI_API_KEY=your_key</code>
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel - Input */}
          <div className="space-y-6">
            <div className={`rounded-xl border shadow-sm overflow-hidden transition-colors duration-300 ${
              isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
            }`}>
              <div className={`px-6 py-4 border-b transition-colors duration-300 ${
                isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'
              }`}>
                <h2 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Source Document</h2>
                <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Upload your reference LBL for redesign</p>
              </div>
              <div className="p-6">
                <FileUpload
                  onFileSelect={handleFileSelect}
                  file={file}
                  previewUrls={previewUrls}
                  isDarkMode={isDarkMode}
                />
              </div>
            </div>

            <div className={`rounded-xl border shadow-sm overflow-hidden transition-colors duration-300 ${
              isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
            }`}>
              <div className={`px-6 py-4 border-b transition-colors duration-300 ${
                isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'
              }`}>
                <h2 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Generation Settings</h2>
                <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Configure output parameters</p>
              </div>
              <div className="p-6 space-y-5">
                <LanguageSelect
                  value={language}
                  onChange={setLanguage}
                  isDarkMode={isDarkMode}
                />
                <div className="grid grid-cols-2 gap-4">
                  <BrandSelect
                    value={brand}
                    onChange={setBrand}
                    isDarkMode={isDarkMode}
                  />
                  <ThemeSelect
                    value={theme}
                    onChange={setTheme}
                    isDarkMode={isDarkMode}
                  />
                </div>
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
          <div className={`rounded-xl border shadow-sm overflow-hidden transition-colors duration-300 ${
            isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          }`}>
            <div className={`px-6 py-4 border-b transition-colors duration-300 ${
              isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'
            }`}>
              <h2 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Generated Output</h2>
              <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Your new LBL design will appear here</p>
            </div>
            <div className="p-6">
              <ImageOutput
                imageData={generatedImage}
                mimeType={imageMimeType}
                isLoading={isLoading}
                error={error}
                isDarkMode={isDarkMode}
              />
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
            LBL Generator &middot; For internal use only &middot; Compliant with UCPMP 2025 Guidelines
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
