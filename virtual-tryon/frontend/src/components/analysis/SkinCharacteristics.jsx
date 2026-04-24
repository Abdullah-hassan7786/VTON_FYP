import React from 'react';
import Badge from '../ui/Badge';
import { Droplet, Sun } from 'lucide-react';

const SkinCharacteristics = ({ characteristics }) => {
  // Try to parse out the undertone and contrast if possible from the string
  const lowerChars = characteristics.toLowerCase();
  
  let undertone = 'Neutral';
  let undertoneColor = 'default';
  if (lowerChars.includes('warm')) {
    undertone = 'Warm';
    undertoneColor = 'orange';
  } else if (lowerChars.includes('cool')) {
    undertone = 'Cool';
    undertoneColor = 'blue';
  } else if (lowerChars.includes('olive')) {
    undertone = 'Olive';
    undertoneColor = 'green';
  }

  let lightness = 'Medium';
  if (lowerChars.includes('light') || lowerChars.includes('fair') || lowerChars.includes('pale')) {
    lightness = 'Light';
  } else if (lowerChars.includes('dark') || lowerChars.includes('deep')) {
    lightness = 'Deep';
  }

  return (
    <div className="bg-bg-tertiary rounded-xl p-5 mb-6">
      <h4 className="text-sm font-bold text-secondary mb-3 uppercase tracking-wider">Skin Analysis Details</h4>
      
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm border border-border">
          <Sun size={16} className="text-primary" />
          <span className="text-xs text-text-secondary">Undertone:</span>
          <Badge variant={undertoneColor}>{undertone}</Badge>
        </div>
        
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm border border-border">
          <Droplet size={16} className="text-blue-500" />
          <span className="text-xs text-text-secondary">Value:</span>
          <Badge variant="default">{lightness}</Badge>
        </div>
      </div>
      
      <p className="text-sm text-text-secondary leading-relaxed">
        {characteristics}
      </p>
    </div>
  );
};

export default SkinCharacteristics;
