import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Filter } from 'lucide-react';
import { mockClothingData } from '../data/mockClothingData';

import FilterBar from '../components/catalog/FilterBar';
import ClothingGrid from '../components/catalog/ClothingGrid';
import Button from '../components/ui/Button';

const CatalogPage = () => {
  const location = useLocation();
  const prefilledSeason = location.state?.season || 'All';

  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const [filters, setFilters] = useState({
    category: 'All',
    season: prefilledSeason,
    colorFamily: 'All'
  });

  // Simulate fetching data
  useEffect(() => {
    setIsLoading(true);
    // In a real app, you would fetch from API based on filters
    setTimeout(() => {
      setItems(mockClothingData);
      setIsLoading(false);
    }, 800);
  }, []);

  // Apply filters locally
  useEffect(() => {
    if (items.length === 0) return;

    let result = [...items];

    if (filters.category !== 'All') {
      result = result.filter(item => item.category === filters.category);
    }

    if (filters.season !== 'All') {
      result = result.filter(item => item.seasons.includes(filters.season));
    }

    if (filters.colorFamily !== 'All') {
      result = result.filter(item => item.colorFamily === filters.colorFamily);
    }

    setFilteredItems(result);
  }, [items, filters]);

  const clearFilters = () => {
    setFilters({
      category: 'All',
      season: 'All',
      colorFamily: 'All'
    });
  };

  return (
    <div className="min-h-screen bg-bg-primary pt-20">
      
      {/* Header */}
      <div className="bg-white border-b border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold font-display text-secondary mb-2">Clothing Catalog</h1>
              <p className="text-text-secondary">
                {isLoading ? 'Loading items...' : `Showing ${filteredItems.length} items`}
                {filters.season !== 'All' && <span className="ml-1 text-primary font-medium">in {filters.season}</span>}
              </p>
            </div>
            
            <div className="md:hidden">
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => setIsMobileFilterOpen(true)}
              >
                <Filter size={18} className="mr-2" /> Filters
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Sidebar Filters */}
          <FilterBar 
            filters={filters} 
            setFilters={setFilters} 
            onClear={clearFilters}
            isOpen={isMobileFilterOpen}
            setIsOpen={setIsMobileFilterOpen}
          />

          {/* Main Grid */}
          <div className="flex-1">
            <ClothingGrid items={filteredItems} isLoading={isLoading} />
          </div>

        </div>
      </div>

      {/* Mobile Filter Overlay Background */}
      {isMobileFilterOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsMobileFilterOpen(false)}
        />
      )}
    </div>
  );
};

export default CatalogPage;
