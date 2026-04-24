import React from 'react';

const SkeletonLoader = ({ 
  variant = 'text', 
  className = '',
  rows = 1
}) => {
  const baseStyles = "animate-pulse bg-bg-tertiary rounded";
  
  const variants = {
    text: "h-4 w-full",
    card: "h-48 w-full rounded-2xl",
    circle: "h-12 w-12 rounded-full",
    image: "h-full w-full rounded-xl"
  };

  if (rows > 1 && variant === 'text') {
    return (
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div 
            key={i} 
            className={`${baseStyles} ${variants[variant]} ${
              i === rows - 1 ? 'w-2/3' : 'w-full'
            } ${className}`}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={`${baseStyles} ${variants[variant]} ${className}`} />
  );
};

export default SkeletonLoader;
