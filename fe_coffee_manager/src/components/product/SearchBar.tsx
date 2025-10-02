import { Search, Filter, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { catalogService } from '../../services';
import { CatalogCategory } from '../../types';

interface SearchBarProps {
  search: string;
  category: string;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  searchLoading?: boolean;
}

export default function SearchBar({
  search,
  category,
  onSearchChange,
  onCategoryChange,
  searchLoading = false,
}: SearchBarProps) {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const data = await catalogService.getCategories();
        setCategories(data);
      } catch (error) {
        console.error('Error loading categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="flex-1 relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 flex items-center justify-center">
          {searchLoading ? (
            <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
          ) : (
            <Search className="w-5 h-5 text-gray-400" />
          )}
        </div>
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
        />
      </div>
      <div className="relative sm:w-64">
        <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none appearance-none bg-white cursor-pointer transition-all"
        >
          <option value="">All Categories</option>
          {loading ? (
            <option disabled>Loading categories...</option>
          ) : (
            categories.map((cat) => (
              <option key={cat.categoryId} value={cat.name}>
                {cat.name}
              </option>
            ))
          )}
        </select>
      </div>
    </div>
  );
}
