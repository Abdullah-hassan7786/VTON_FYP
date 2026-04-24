import React from 'react';
import { X, CheckCircle, Info } from 'lucide-react';
import { motion } from 'framer-motion';

const ImagePreview = ({ file, fileUrl, onRemove }) => {
  const fileSize = file ? (file.size / (1024 * 1024)).toFixed(2) : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-border p-6 shadow-sm flex flex-col md:flex-row gap-6 items-start"
    >
      <div className="relative shrink-0">
        <div className="w-40 h-40 rounded-xl overflow-hidden bg-bg-tertiary border border-border shadow-sm">
          {fileUrl && (
            <img 
              src={fileUrl} 
              alt="Preview" 
              className="w-full h-full object-cover"
            />
          )}
        </div>
        <button
          onClick={onRemove}
          className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white border border-border text-text-muted hover:text-error hover:border-error shadow-sm flex items-center justify-center transition-colors"
          aria-label="Remove image"
        >
          <X size={16} />
        </button>
      </div>
      
      <div className="flex-1 w-full">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle size={20} className="text-success" />
          <h4 className="font-bold text-secondary text-lg">Image Selected</h4>
        </div>
        
        {file && (
          <p className="text-text-secondary text-sm mb-4 truncate max-w-[250px] md:max-w-md">
            {file.name} ({fileSize} MB)
          </p>
        )}
        
        <div className="bg-bg-secondary rounded-xl p-4 border border-border/50">
          <div className="flex items-start gap-3">
            <Info size={18} className="text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-secondary mb-1">Tips for best results:</p>
              <ul className="text-sm text-text-secondary space-y-1 list-disc list-inside">
                <li>Ensure good, natural lighting</li>
                <li>Face forward directly at the camera</li>
                <li>Use a plain, uncolored background if possible</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ImagePreview;
