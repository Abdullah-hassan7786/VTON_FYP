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
    <div className="mb-10">
      <div className="flex items-start gap-4 mb-6">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${bgColor} ${iconColor}`}>
          <Icon size={20} strokeWidth={3} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-secondary mb-2 font-display">{title}</h3>
          <p className="text-text-secondary text-sm leading-relaxed">{reason}</p>
        </div>
      </div>

      <motion.div 
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-50px" }}
        className="grid grid-cols-4 sm:grid-cols-6 gap-y-6 gap-x-2"
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
