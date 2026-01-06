interface FocusAreaSelectProps {
  value: string;
  onChange: (focusArea: string) => void;
  isDarkMode?: boolean;
}

export const FOCUS_AREAS = [
  {
    code: 'Efficacy',
    name: 'Efficacy',
    description: 'Clinical efficacy, onset of action, duration of relief'
  },
  {
    code: 'Safety',
    name: 'Safety',
    description: 'Safety profile, tolerability, side effects'
  },
  {
    code: 'Evidence',
    name: 'Evidence',
    description: 'Clinical studies, guidelines, scientific data'
  },
];

export function FocusAreaSelect({ value, onChange, isDarkMode = false }: FocusAreaSelectProps) {
  return (
    <div className="w-full">
      <label className={`block text-xs font-medium mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
        Focus Area
      </label>
      <div className="grid grid-cols-3 gap-2">
        {FOCUS_AREAS.map((area) => (
          <button
            key={area.code}
            onClick={() => onChange(area.code)}
            className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                       border-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20
                       ${value === area.code
                         ? isDarkMode
                           ? 'bg-indigo-600 border-indigo-500 text-white'
                           : 'bg-indigo-500 border-indigo-500 text-white'
                         : isDarkMode
                           ? 'bg-slate-700 border-slate-600 text-slate-300 hover:border-indigo-400'
                           : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300'
                       }`}
          >
            {area.name}
          </button>
        ))}
      </div>
      <p className={`mt-1.5 text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
        {FOCUS_AREAS.find(a => a.code === value)?.description || 'Select a focus area for the LBL'}
      </p>
    </div>
  );
}
