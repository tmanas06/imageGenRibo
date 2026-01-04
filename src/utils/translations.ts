// Translation mappings for Hindi and Tamil
// These can be used for manual text overlay or reference

export interface Translation {
  english: string;
  hindi: string;
  tamil: string;
}

export const PHARMA_TRANSLATIONS: Translation[] = [
  // Time-related
  { english: '5 minutes', hindi: '5 मिनट', tamil: '5 நிமிடங்கள்' },
  { english: '12 hours', hindi: '12 घंटे', tamil: '12 மணி நேரம்' },
  { english: 'minutes', hindi: 'मिनट', tamil: 'நிமிடங்கள்' },
  { english: 'hours', hindi: 'घंटे', tamil: 'மணி நேரம்' },

  // Action words
  { english: 'Fast Relief', hindi: 'तेज़ राहत', tamil: 'விரைவான நிவாரணம்' },
  { english: 'Quick Action', hindi: 'त्वरित कार्रवाई', tamil: 'விரைவான செயல்' },
  { english: 'Long Lasting', hindi: 'लंबे समय तक', tamil: 'நீண்ட நேரம்' },
  { english: 'Fast acting', hindi: 'तेज़ असर', tamil: 'வேகமாக செயல்படும்' },
  { english: 'Long lasting relief', hindi: 'लंबे समय तक राहत', tamil: 'நீண்ட நேர நிவாரணம்' },

  // Medical terms
  { english: 'Relief', hindi: 'राहत', tamil: 'நிவாரணம்' },
  { english: 'Protection', hindi: 'सुरक्षा', tamil: 'பாதுகாப்பு' },
  { english: 'Control', hindi: 'नियंत्रण', tamil: 'கட்டுப்பாடு' },
  { english: 'Improvement', hindi: 'सुधार', tamil: 'முன்னேற்றம்' },
  { english: 'Effective', hindi: 'प्रभावी', tamil: 'பயனுள்ள' },
  { english: 'Treatment', hindi: 'उपचार', tamil: 'சிகிச்சை' },
  { english: 'Breathe Easy', hindi: 'आसानी से सांस लें', tamil: 'எளிதாக சுவாசிக்கவும்' },

  // COPD specific
  { english: 'Reduces exacerbations', hindi: 'तीव्रता को कम करता है', tamil: 'தீவிரத்தை குறைக்கிறது' },
  { english: 'Exacerbation reduction', hindi: 'तीव्रता में कमी', tamil: 'தீவிரம் குறைப்பு' },
  { english: 'Improves lung function', hindi: 'फेफड़ों की कार्यक्षमता में सुधार', tamil: 'நுரையீரல் செயல்பாட்டை மேம்படுத்துகிறது' },

  // Regulatory text
  {
    english: 'For the use of a Registered Medical Practitioner or a Hospital or a Laboratory only',
    hindi: 'केवल पंजीकृत चिकित्सक या अस्पताल या प्रयोगशाला के उपयोग के लिए',
    tamil: 'பதிவு செய்யப்பட்ட மருத்துவர் அல்லது மருத்துவமனை அல்லது ஆய்வகத்தின் பயன்பாட்டிற்கு மட்டும்'
  },
  { english: 'Hospital', hindi: 'अस्पताल', tamil: 'மருத்துவமனை' },
  { english: 'Laboratory', hindi: 'प्रयोगशाला', tamil: 'ஆய்வகம்' },
  { english: 'Doctor', hindi: 'चिकित्सक', tamil: 'மருத்துவர்' },
  { english: 'Patient', hindi: 'रोगी', tamil: 'நோயாளி' },

  // Common headlines
  { english: 'Action within 5 mins', hindi: '5 मिनट में असर', tamil: '5 நிமிடங்களில் செயல்' },
  { english: 'Long lasting relief', hindi: 'लंबे समय तक राहत', tamil: 'நீண்ட நேர நிவாரணம்' },
];

// Get all translations for a language
export function getAllTranslations(language: 'Hindi' | 'Tamil'): { english: string; translated: string }[] {
  return PHARMA_TRANSLATIONS.map(t => ({
    english: t.english,
    translated: language === 'Hindi' ? t.hindi : t.tamil,
  }));
}

// Common pharma claims with translations
export const COMMON_CLAIMS = {
  efficacy: {
    english: 'Quick onset of action within 5 mins',
    hindi: '5 मिनट में त्वरित असर',
    tamil: '5 நிமிடங்களில் விரைவான செயல்',
  },
  duration: {
    english: '12 hours long lasting relief',
    hindi: '12 घंटे लंबे समय तक राहत',
    tamil: '12 மணி நேரம் நீடித்த நிவாரணம்',
  },
  exacerbation: {
    english: 'Reduces exacerbations by 12%-15%',
    hindi: 'तीव्रता को 12%-15% तक कम करता है',
    tamil: 'தீவிரத்தை 12%-15% குறைக்கிறது',
  },
  lungFunction: {
    english: 'Improves lung function by 120ml',
    hindi: 'फेफड़ों की कार्यक्षमता में 120ml सुधार',
    tamil: 'நுரையீரல் செயல்பாட்டை 120ml மேம்படுத்துகிறது',
  },
};
