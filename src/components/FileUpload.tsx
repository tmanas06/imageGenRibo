import { useCallback, useState } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  file: File | null;
  previewUrls: string[];
}

export function FileUpload({ onFileSelect, file, previewUrls }: FileUploadProps) {
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

  return (
    <div className="w-full">
      <label
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          flex flex-col items-center justify-center w-full min-h-[160px] p-6
          border-2 border-dashed rounded-xl cursor-pointer
          transition-all duration-200
          ${isDragging
            ? 'border-blue-500 bg-blue-50'
            : file
              ? 'border-green-400 bg-green-50'
              : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400'
          }
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
            <svg className="w-10 h-10 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm text-gray-600 font-medium">
              Drop reference image/PDF here
            </p>
            <p className="text-xs text-gray-400 mt-1">
              or click to browse (optional - for style reference)
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Supports: PDF, PNG, JPG, WEBP
            </p>
          </>
        ) : (
          <div className="w-full">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">
                  {file.name}
                </span>
              </div>
              <span className="text-xs text-gray-400">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>

            {previewUrls.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {previewUrls.slice(0, 4).map((url, index) => (
                  <img
                    key={index}
                    src={url}
                    alt={`Preview ${index + 1}`}
                    className="h-20 w-20 object-cover rounded-lg border border-gray-200"
                  />
                ))}
                {previewUrls.length > 4 && (
                  <div className="h-20 w-20 flex items-center justify-center bg-gray-100 rounded-lg border border-gray-200">
                    <span className="text-sm text-gray-500">+{previewUrls.length - 4}</span>
                  </div>
                )}
              </div>
            )}

            <p className="text-xs text-gray-400 mt-2 text-center">
              Click to replace file
            </p>
          </div>
        )}
      </label>
    </div>
  );
}
