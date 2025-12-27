interface BrandSelectProps {
  value: string;
  onChange: (brand: string) => void;
}

const BRANDS = [
  { code: 'glenmark', name: 'Glenmark' },
  { code: 'lupin', name: 'Lupin' },
];

export function BrandSelect({ value, onChange }: BrandSelectProps) {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Brand
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
        {BRANDS.map((brand) => (
          <option key={brand.code} value={brand.code}>
            {brand.name}
          </option>
        ))}
      </select>
    </div>
  );
}
