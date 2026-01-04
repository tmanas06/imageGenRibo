import { COMMON_CLAIMS, getAllTranslations } from '../utils/translations';

interface TranslationPanelProps {
  language: string;
  isDarkMode?: boolean;
}

export function TranslationPanel({ language, isDarkMode = false }: TranslationPanelProps) {
  // Only show for Hindi or Tamil
  if (language === 'English') {
    return null;
  }

  const translations = getAllTranslations(language as 'Hindi' | 'Tamil');
  const claims = COMMON_CLAIMS;
  const langKey = language.toLowerCase() as 'hindi' | 'tamil';

  return (
    <div className={`rounded-xl border shadow-sm overflow-hidden transition-colors duration-300 ${
      isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
    }`}>
      <div className={`px-6 py-4 border-b transition-colors duration-300 ${
        isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'
      }`}>
        <h2 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          {language} Translation Reference
        </h2>
        <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Use these translations for manual text overlay
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Key Claims */}
        <div>
          <h3 className={`text-xs font-semibold mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            Key Claims
          </h3>
          <div className="space-y-2">
            {Object.entries(claims).map(([key, value]) => (
              <div key={key} className={`p-2 rounded-lg ${isDarkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {value.english}
                </p>
                <p className={`text-sm font-medium mt-1 ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>
                  {value[langKey]}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Common Words */}
        <div>
          <h3 className={`text-xs font-semibold mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            Common Terms
          </h3>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {translations.slice(0, 12).map((t, i) => (
              <div key={i} className={`p-2 rounded text-xs ${isDarkMode ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>{t.english}</span>
                <br />
                <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{t.translated}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Regulatory Text */}
        <div className={`p-3 rounded-lg border ${isDarkMode ? 'border-amber-800 bg-amber-900/20' : 'border-amber-200 bg-amber-50'}`}>
          <h3 className={`text-xs font-semibold mb-1 ${isDarkMode ? 'text-amber-300' : 'text-amber-700'}`}>
            Regulatory Disclaimer
          </h3>
          <p className={`text-xs ${isDarkMode ? 'text-amber-200' : 'text-amber-800'}`}>
            {language === 'Hindi'
              ? 'केवल पंजीकृत चिकित्सक या अस्पताल या प्रयोगशाला के उपयोग के लिए'
              : 'பதிவு செய்யப்பட்ட மருத்துவர் அல்லது மருத்துவமனை அல்லது ஆய்வகத்தின் பயன்பாட்டிற்கு மட்டும்'
            }
          </p>
        </div>
      </div>
    </div>
  );
}
