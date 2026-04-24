import React from 'react';
import { motion } from 'framer-motion';

const SeasonBadge = ({ season, className = '' }) => {
  // Map seasons to their respective colors and icons
  const getSeasonConfig = (seasonName) => {
    const lower = seasonName.toLowerCase();
    if (lower.includes('spring')) {
      return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', icon: '🌸' };
    }
    if (lower.includes('summer')) {
      return { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', icon: '🌊' };
    }
    if (lower.includes('autumn')) {
      return { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', icon: '🍂' };
    }
    if (lower.includes('winter')) {
      return { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200', icon: '❄️' };
    }
    return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200', icon: '✨' };
  };

  const config = getSeasonConfig(season);

  return (
    <motion.div 
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', bounce: 0.5 }}
      className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border ${config.bg} ${config.text} ${config.border} font-medium ${className}`}
    >
      <span className="text-lg">{config.icon}</span>
      <span>{season}</span>
    </motion.div>
  );
};

export default SeasonBadge;
