import React from 'react';
import { Filter, X } from 'lucide-react';
import Button from '../ui/Button';

const FilterBar = ({ 
  filters, 
  setFilters, 
  onClear,
  isOpen,
  setIsOpen
}) => {
  const categories = ['All', 'Tops', 'Dresses', 'Bottoms', 'Outerwear'];
  const seasons = [
    'All',
    'Light Spring', 'Warm Spring', 'Bright Spring',
    'Light Summer', 'Cool Summer', 'Soft Summer',
    'Soft Autumn', 'Warm Autumn', 'Deep Autumn',
    'Cool Winter', 'Deep Winter', 'Bright Winter'
  ];
  const colorFamilies = ['All', 'warm', 'cool', 'neutral'];

  return (
    <div className={`
      fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-border shadow-xl transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:shadow-none md:w-64 md:border-r-0 md:pr-6
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    `}>
      <div className="h-full flex flex-col overflow-y-auto hide-scrollbar p-6 md:p-0">
        <div className="flex items-center justify-between mb-8 md:hidden">
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <Filter size={20} /> Filters
          </h2>
          <button onClick={() => setIsOpen(false)} className="p-2 text-text-muted hover:text-secondary bg-bg-tertiary rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2 mb-6 text-lg font-bold font-display text-secondary border-b border-border pb-4">
          <Filter size={18} /> Filters
        </div>

        <div className="space-y-8 flex-1">
          {/* Category Filter */}
          <div>
            <h3 className="text-sm font-bold text-secondary uppercase tracking-wider mb-3">Category</h3>
            <div className="space-y-2">
              {categories.map(cat => (
                <label key={cat} className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    type="radio" 
                    name="category"
                    checked={filters.category === cat}
                    onChange={() => setFilters({ ...filters, category: cat })}
                    className="w-4 h-4 text-primary bg-bg-tertiary border-border focus:ring-primary focus:ring-offset-0 focus:ring-2"
                  />
                  <span className={`text-sm transition-colors ${filters.category === cat ? 'text-secondary font-medium' : 'text-text-secondary group-hover:text-secondary'}`}>
                    {cat}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Color Season Filter */}
          <div>
            <h3 className="text-sm font-bold text-secondary uppercase tracking-wider mb-3">Color Season</h3>
            <select 
              value={filters.season}
              onChange={(e) => setFilters({ ...filters, season: e.target.value })}
              className="w-full bg-bg-tertiary border border-transparent rounded-lg px-3 py-2.5 text-sm text-secondary focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            >
              {seasons.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Color Family Filter */}
          <div>
            <h3 className="text-sm font-bold text-secondary uppercase tracking-wider mb-3">Color Temp</h3>
            <div className="flex flex-wrap gap-2">
              {colorFamilies.map(family => (
                <button
                  key={family}
                  onClick={() => setFilters({ ...filters, colorFamily: family })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                    filters.colorFamily === family 
                      ? 'bg-secondary text-white shadow-md' 
                      : 'bg-bg-tertiary text-text-secondary hover:bg-border'
                  }`}
                >
                  {family}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border">
          <Button 
            variant="outline" 
            className="w-full bg-white text-sm"
            onClick={onClear}
          >
            Clear All Filters
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
