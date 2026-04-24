import React from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const ColorSwatch = ({ 
  name, 
  hex_code, 
  size = 'md', 
  onClick, 
  showName = true, 
  avoided = false 
}) => {
  const handleCopy = () => {
    if (onClick) {
      onClick();
      return;
    }
    navigator.clipboard.writeText(hex_code);
    toast.success(`Copied ${hex_code}!`, {
      style: {
        border: '1px solid var(--border)',
        padding: '16px',
        color: 'var(--text-primary)',
      },
      iconTheme: {
        primary: hex_code,
        secondary: '#FFF',
      },
    });
  };

  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  return (
    <div className="flex flex-col items-center gap-2 group relative">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={handleCopy}
        className={`rounded-full shadow-sm border border-black/5 relative overflow-hidden ${sizes[size]}`}
        style={{ backgroundColor: hex_code }}
        title={hex_code}
      >
        {avoided && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-0.5 bg-black/40 rotate-45 transform origin-center"></div>
          </div>
        )}
      </motion.button>
      
      {showName && (
        <span className="text-xs text-text-secondary font-medium text-center max-w-[80px] leading-tight group-hover:text-text-primary transition-colors">
          {name}
        </span>
      )}
      
      {/* Tooltip */}
      <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-secondary text-white text-xs px-2 py-1 rounded pointer-events-none whitespace-nowrap z-10 shadow-md">
        {hex_code}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-secondary rotate-45"></div>
      </div>
    </div>
  );
};

export default ColorSwatch;
