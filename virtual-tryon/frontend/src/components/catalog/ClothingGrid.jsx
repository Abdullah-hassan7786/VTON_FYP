import React from 'react';
import ClothingCard from './ClothingCard';
import SkeletonLoader from '../ui/SkeletonLoader';

const ClothingGrid = ({ items, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <SkeletonLoader variant="card" className="h-[280px] md:h-[320px]" />
            <SkeletonLoader variant="text" />
            <SkeletonLoader variant="text" className="w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="text-center py-20 px-4">
        <div className="w-24 h-24 bg-bg-tertiary rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">👕</span>
        </div>
        <h3 className="text-xl font-bold text-secondary mb-2">No items found</h3>
        <p className="text-text-secondary">Try adjusting your filters to see more results.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {items.map(item => (
        <ClothingCard key={item.id} item={item} />
      ))}
    </div>
  );
};

export default ClothingGrid;
