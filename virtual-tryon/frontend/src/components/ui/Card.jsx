import React from 'react';
import { motion } from 'framer-motion';

const Card = ({ 
  children, 
  className = '', 
  hover = false,
  ...props 
}) => {
  const Component = hover ? motion.div : 'div';
  const hoverProps = hover ? {
    whileHover: { y: -4, boxShadow: 'var(--shadow-md)' },
    transition: { duration: 0.2 }
  } : {};

  return (
    <Component
      className={`bg-white rounded-2xl border border-border shadow-sm overflow-hidden ${className}`}
      {...hoverProps}
      {...props}
    >
      {children}
    </Component>
  );
};

export default Card;
