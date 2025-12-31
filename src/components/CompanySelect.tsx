interface CompanySelectProps {
  value: string;
  onChange: (company: string) => void;
  isDarkMode?: boolean;
}

const COMPANIES = [
  { code: 'lupin', name: 'Lupin' },
  { code: 'glenmark', name: 'Glenmark' },
];

export function CompanySelect({ value, onChange, isDarkMode = false }: CompanySelectProps) {
  return (
    <div className="w-full">
      <label className={`block text-xs font-medium mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
        Company
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3 py-2.5 border rounded-lg text-sm
                   focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400
                   transition-all duration-150
                   cursor-pointer appearance-none
                   bg-no-repeat bg-[right_10px_center] bg-[length:16px]
                   ${isDarkMode
                     ? 'bg-slate-700 border-slate-600 text-slate-200 bg-[url(\'data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E\')]'
                     : 'bg-white border-slate-200 text-slate-800 bg-[url(\'data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E\')]'
                   }`}
      >
        {COMPANIES.map((company) => (
          <option key={company.code} value={company.code}>
            {company.name}
          </option>
        ))}
      </select>
    </div>
  );
}
