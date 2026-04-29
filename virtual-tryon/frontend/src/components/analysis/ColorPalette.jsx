import React from 'react';
import { motion } from 'framer-motion';
import ColorSwatch from '../ui/ColorSwatch';
import { Check, X } from 'lucide-react';

const ColorPalette = ({ 
  title, 
  colors, 
  reason, 
  type = 'suggest' // 'suggest' or 'avoid'
}) => {
  const isSuggest = type === 'suggest';
  const Icon = isSuggest ? Check : X;
  const iconColor = isSuggest ? 'text-success' : 'text-error';
  const bgColor = isSuggest ? 'bg-success/10' : 'bg-error/10';

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const item = {
    hidden: { scale: 0, opacity: 0 },
    show: { scale: 1, opacity: 1, transition: { type: 'spring' } }
  };

  return (
    <div className="mb-6 last:mb-0">
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${bgColor} ${iconColor}`}>
          <Icon size={16} strokeWidth={3} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-secondary mb-1 font-display">{title}</h3>
          <p className="text-text-secondary text-[13px] leading-relaxed line-clamp-2">{reason}</p>
        </div>
      </div>

      <motion.div 
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-20px" }}
        className="grid grid-cols-4 sm:grid-cols-6 gap-y-3 gap-x-2"
      >
        {colors.map((color, index) => (
          <motion.div key={index} variants={item} className="flex justify-center">
            <ColorSwatch 
              name={color.name} 
              hex_code={color.hex_code} 
              avoided={!isSuggest}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default ColorPalette;
