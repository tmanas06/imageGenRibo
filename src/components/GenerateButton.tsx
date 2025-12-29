interface GenerateButtonProps {
  onClick: () => void;
  disabled: boolean;
  isLoading: boolean;
  isDarkMode?: boolean;
}

export function GenerateButton({ onClick, disabled, isLoading, isDarkMode = false }: GenerateButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`
        w-full py-3.5 px-6 rounded-lg font-medium text-sm
        flex items-center justify-center gap-2
        transition-all duration-150
        ${disabled || isLoading
          ? isDarkMode
            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow'
        }
      `}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Generating...
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Generate LBL
        </>
      )}
    </button>
  );
}
