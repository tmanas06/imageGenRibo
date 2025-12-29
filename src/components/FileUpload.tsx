import { useCallback, useState } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  file: File | null;
  previewUrls: string[];
  isDarkMode?: boolean;
}

export function FileUpload({ onFileSelect, file, previewUrls, isDarkMode = false }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && isValidFile(droppedFile)) {
      onFileSelect(droppedFile);
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && isValidFile(selectedFile)) {
      onFileSelect(selectedFile);
    }
  }, [onFileSelect]);

  const isValidFile = (file: File): boolean => {
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    return validTypes.includes(file.type) || file.name.toLowerCase().endsWith('.pdf');
  };

  const getDropzoneClasses = () => {
    if (isDragging) {
      return isDarkMode
        ? 'border-indigo-400 bg-indigo-900/30'
        : 'border-indigo-400 bg-indigo-50';
    }
    if (file) {
      return isDarkMode
        ? 'border-emerald-500/50 bg-emerald-900/20'
        : 'border-emerald-300 bg-emerald-50/50';
    }
    return isDarkMode
      ? 'border-slate-600 bg-slate-700/50 hover:bg-slate-700 hover:border-slate-500'
      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-300';
  };

  return (
    <div className="w-full">
      <label
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          flex flex-col items-center justify-center w-full min-h-[180px] p-6
          border-2 border-dashed rounded-lg cursor-pointer
          transition-all duration-200
          ${getDropzoneClasses()}
        `}
      >
        <input
          type="file"
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.gif"
          onChange={handleFileInput}
        />

        {!file ? (
          <>
            <div className={`w-12 h-12 mb-4 rounded-full flex items-center justify-center ${
              isDarkMode ? 'bg-slate-600' : 'bg-slate-100'
            }`}>
              <svg className={`w-6 h-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Drop your file here or click to browse
            </p>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              PDF, PNG, JPG, WEBP supported
            </p>
          </>
        ) : (
          <div className="w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                isDarkMode ? 'bg-emerald-900/50' : 'bg-emerald-100'
              }`}>
                <svg className={`w-5 h-5 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                  {file.name}
                </p>
                <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>

            {previewUrls.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {previewUrls.slice(0, 4).map((url, index) => (
                  <img
                    key={index}
                    src={url}
                    alt={`Preview ${index + 1}`}
                    className={`h-16 w-16 object-cover rounded-lg border flex-shrink-0 ${
                      isDarkMode ? 'border-slate-600' : 'border-slate-200'
                    }`}
                  />
                ))}
                {previewUrls.length > 4 && (
                  <div className={`h-16 w-16 flex items-center justify-center rounded-lg border flex-shrink-0 ${
                    isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-100 border-slate-200'
                  }`}>
                    <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>+{previewUrls.length - 4}</span>
                  </div>
                )}
              </div>
            )}

            <p className={`text-xs mt-3 text-center ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Click to replace
            </p>
          </div>
        )}
      </label>
    </div>
  );
}
