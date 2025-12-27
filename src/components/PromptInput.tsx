interface PromptInputProps {
  value: string;
  onChange: (prompt: string) => void;
  disabled?: boolean;
}

const EXAMPLE_PROMPTS = [
  "A serene mountain landscape at sunset with golden light",
  "A futuristic cityscape with flying cars and neon lights",
  "A cozy coffee shop interior with warm lighting",
  "An abstract art piece with vibrant colors and geometric shapes",
];

export function PromptInput({ value, onChange, disabled }: PromptInputProps) {
  const handleExampleClick = (example: string) => {
    onChange(example);
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Prompt
        <span className="text-gray-400 font-normal ml-1">(describe the image you want)</span>
      </label>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Describe the image you want to generate..."
        rows={4}
        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl
                   text-gray-700 text-sm placeholder-gray-400
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                   transition-all duration-200 resize-none
                   disabled:bg-gray-100 disabled:cursor-not-allowed"
      />

      <div className="flex items-center justify-between mt-2">
        <span className={`text-xs ${value.length > 4000 ? 'text-red-500' : 'text-gray-400'}`}>
          {value.length} / 4000 characters
        </span>
      </div>

      {!value && (
        <div className="mt-3">
          <p className="text-xs text-gray-500 mb-2">Try an example:</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((example, index) => (
              <button
                key={index}
                onClick={() => handleExampleClick(example)}
                disabled={disabled}
                className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200
                         text-gray-600 rounded-lg transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {example.length > 40 ? example.slice(0, 40) + '...' : example}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
