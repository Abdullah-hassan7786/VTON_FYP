import React from 'react';
import Card from '../ui/Card';
import SeasonBadge from './SeasonBadge';
import SkinCharacteristics from './SkinCharacteristics';

const AnalysisCard = ({ analysisData }) => {
  if (!analysisData) return null;

  return (
    <Card className="h-full flex flex-col">
      <div className="p-8 flex-1">
        <div className="text-center mb-8">
          <p className="text-text-secondary text-sm font-medium uppercase tracking-widest mb-3">Your Color Season is</p>
          <h2 className="text-4xl md:text-5xl font-bold font-display text-secondary mb-6">{analysisData.season}</h2>
          <SeasonBadge season={analysisData.season} className="mb-8" />
        </div>

        {analysisData.croppedImageBase64 && (
          <div className="flex justify-center mb-8">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-white shadow-lg relative">
              <img 
                src={`data:image/jpeg;base64,${analysisData.croppedImageBase64}`} 
                alt="Your face" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 rounded-full ring-1 ring-black/5 inset-ring"></div>
            </div>
          </div>
        )}

        <SkinCharacteristics characteristics={analysisData.characteristics} />

        <div className="mt-6">
          <h4 className="text-sm font-bold text-secondary mb-3 uppercase tracking-wider">Style Summary</h4>
          <p className="text-text-primary leading-relaxed text-sm">
            {analysisData.content}
          </p>
        </div>
      </div>
    </Card>
  );
};

export default AnalysisCard;
