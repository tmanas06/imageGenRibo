interface LanguageSelectProps {
  value: string;
  onChange: (language: string) => void;
}

const LANGUAGES = [
  // Global
  { code: 'English', name: 'English' },
  { code: 'Spanish', name: 'Spanish (Español)' },
  { code: 'French', name: 'French (Français)' },
  { code: 'German', name: 'German (Deutsch)' },
  { code: 'Chinese', name: 'Chinese (中文)' },
  { code: 'Japanese', name: 'Japanese (日本語)' },
  { code: 'Korean', name: 'Korean (한국어)' },
  { code: 'Arabic', name: 'Arabic (العربية)' },
  { code: 'Portuguese', name: 'Portuguese (Português)' },
  { code: 'Russian', name: 'Russian (Русский)' },
  // Indian
  { code: 'Hindi', name: 'Hindi (हिन्दी)' },
  { code: 'Tamil', name: 'Tamil (தமிழ்)' },
  { code: 'Telugu', name: 'Telugu (తెలుగు)' },
  { code: 'Kannada', name: 'Kannada (ಕನ್ನಡ)' },
  { code: 'Malayalam', name: 'Malayalam (മലയാളം)' },
  { code: 'Bengali', name: 'Bengali (বাংলা)' },
  { code: 'Marathi', name: 'Marathi (मराठी)' },
  { code: 'Gujarati', name: 'Gujarati (ગુજરાતી)' },
  { code: 'Punjabi', name: 'Punjabi (ਪੰਜਾਬੀ)' },
  { code: 'Odia', name: 'Odia (ଓଡ଼ିଆ)' },
];

export function LanguageSelect({ value, onChange }: LanguageSelectProps) {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Language
        <span className="text-gray-400 font-normal ml-1">(for text in generated image)</span>
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl
                   text-gray-700 text-sm font-medium
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                   transition-all duration-200
                   cursor-pointer appearance-none
                   bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')]
                   bg-no-repeat bg-[right_12px_center] bg-[length:20px]"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
}
