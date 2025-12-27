import { useState, useCallback } from 'react';
import { FileUpload } from './components/FileUpload';
import { LanguageSelect } from './components/LanguageSelect';
import { PromptInput } from './components/PromptInput';
import { ImageOutput } from './components/ImageOutput';
import { GenerateButton } from './components/GenerateButton';
import { generateImage, isApiConfigured } from './services/nanoBananaService';
import { processFile } from './utils/pdfUtils';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [language, setLanguage] = useState('English');
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState('image/png');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);

    try {
      // Process file to get base64 images
      const base64Images = await processFile(selectedFile);
      setReferenceImages(base64Images);

      // Create preview URLs
      const urls = base64Images.map(base64 => `data:image/jpeg;base64,${base64}`);
      setPreviewUrls(urls);
    } catch (err) {
      console.error('Error processing file:', err);
      setError('Failed to process the uploaded file.');
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
  }, [prompt, language, referenceImages]);

  const canGenerate = prompt.trim().length > 0 && !isLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            RIBOTR
          </h1>
          <p className="text-gray-600">
            AI Image Generator powered by Nano Banana Pro
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          {/* API Warning */}
          {!isApiConfigured() && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-yellow-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-yellow-800">API Key Required</p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Create a <code className="bg-yellow-100 px-1 rounded">.env</code> file with <code className="bg-yellow-100 px-1 rounded">VITE_GEMINI_API_KEY=your_key</code>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* File Upload */}
          <div className="mb-6">
            <FileUpload
              onFileSelect={handleFileSelect}
              file={file}
              previewUrls={previewUrls}
            />
          </div>

          {/* Language Select */}
          <div className="mb-6">
            <LanguageSelect
              value={language}
              onChange={setLanguage}
            />
          </div>

          {/* Prompt Input */}
          <div className="mb-6">
            <PromptInput
              value={prompt}
              onChange={setPrompt}
              disabled={isLoading}
            />
          </div>

          {/* Generate Button */}
          <GenerateButton
            onClick={handleGenerate}
            disabled={!canGenerate}
            isLoading={isLoading}
          />

          {/* Output */}
          <ImageOutput
            imageData={generatedImage}
            mimeType={imageMimeType}
            isLoading={isLoading}
            error={error}
          />
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-gray-400">
          Powered by Google Gemini &middot; Nano Banana Pro
        </div>
      </div>
    </div>
  );
}

export default App;
