interface ImageOutputProps {
  imageData: string | null;
  mimeType: string;
  isLoading: boolean;
  error: string | null;
}

export function ImageOutput({ imageData, mimeType, isLoading, error }: ImageOutputProps) {
  const handleDownload = () => {
    if (!imageData) return;

    const link = document.createElement('a');
    link.href = `data:${mimeType};base64,${imageData}`;
    link.download = `generated-image-${Date.now()}.${mimeType.split('/')[1] || 'png'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="w-full mt-6">
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-4 text-center">Generating Image...</h3>
          <div className="flex flex-col items-center justify-center py-16 bg-gray-50 rounded-xl border border-gray-200">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin border-t-blue-500"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-500">This may take a few seconds...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full mt-6">
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-4 text-center">Error</h3>
          <div className="flex flex-col items-center justify-center py-8 bg-red-50 rounded-xl border border-red-200">
            <svg className="w-12 h-12 text-red-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm text-red-600 text-center px-4">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!imageData) {
    return null;
  }

  return (
    <div className="w-full mt-6">
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-sm font-medium text-gray-700 mb-4 text-center">Generated Image</h3>

        <div className="relative bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
          <img
            src={`data:${mimeType};base64,${imageData}`}
            alt="Generated image"
            className="w-full h-auto max-h-[600px] object-contain"
          />
        </div>

        <div className="flex justify-center mt-4">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 hover:bg-gray-800
                     text-white text-sm font-medium rounded-xl
                     transition-colors duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Image
          </button>
        </div>
      </div>
    </div>
  );
}
