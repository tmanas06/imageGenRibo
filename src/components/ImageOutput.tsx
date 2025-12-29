interface ImageOutputProps {
  imageData: string | null;
  mimeType: string;
  isLoading: boolean;
  error: string | null;
  isDarkMode?: boolean;
}

export function ImageOutput({ imageData, mimeType, isLoading, error, isDarkMode = false }: ImageOutputProps) {
  const handleDownload = () => {
    if (!imageData) return;

    const link = document.createElement('a');
    link.href = `data:${mimeType};base64,${imageData}`;
    link.download = `LBL-${Date.now()}.${mimeType.split('/')[1] || 'png'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="relative">
          <div className={`w-14 h-14 border-[3px] rounded-full ${isDarkMode ? 'border-slate-600' : 'border-slate-200'}`}></div>
          <div className="absolute top-0 left-0 w-14 h-14 border-[3px] border-indigo-500 rounded-full animate-spin border-t-transparent"></div>
        </div>
        <p className={`mt-5 text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Generating your LBL</p>
        <p className={`mt-1 text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>This may take a moment...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
          isDarkMode ? 'bg-red-900/30' : 'bg-red-50'
        }`}>
          <svg className={`w-6 h-6 ${isDarkMode ? 'text-red-400' : 'text-red-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <p className={`text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Generation Failed</p>
        <p className={`text-xs text-center max-w-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{error}</p>
      </div>
    );
  }

  if (!imageData) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
          isDarkMode ? 'bg-slate-700' : 'bg-slate-100'
        }`}>
          <svg className={`w-8 h-8 ${isDarkMode ? 'text-slate-500' : 'text-slate-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>No output yet</p>
        <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Upload a source document and click Generate</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={`relative rounded-lg overflow-hidden border ${
        isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'
      }`}>
        <img
          src={`data:${mimeType};base64,${imageData}`}
          alt="Generated LBL"
          className="w-full h-auto"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleDownload}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5
                   text-sm font-medium rounded-lg transition-colors duration-150
                   ${isDarkMode
                     ? 'bg-white hover:bg-slate-100 text-slate-900'
                     : 'bg-slate-900 hover:bg-slate-800 text-white'
                   }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download
        </button>
      </div>
    </div>
  );
}
