import React from 'react';
import { motion } from 'framer-motion';

interface NenLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  nenType?: string;
  text?: string;
}

export const NenLoader: React.FC<NenLoaderProps> = ({ 
  size = 'md', 
  nenType = 'specialization',
  text = 'LOADING...'
}) => {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  };

  const getNenColor = () => {
    switch (nenType) {
      case 'enhancement':
        return '#FF6B6B';
      case 'emission':
        return '#4ECDC4';
      case 'manipulation':
        return '#FFE66D';
      case 'transmutation':
        return '#95E1D3';
      case 'conjuration':
        return '#A8E6CF';
      case 'specialization':
        return '#C7CEEA';
      default:
        return '#9945FF';
    }
  };

  const color = getNenColor();

  return (
    <div className="flex flex-col items-center justify-center">
      <div className={`relative ${sizeClasses[size]}`}>
        {/* Outer Ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0"
        >
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeDasharray="20 10"
              opacity="0.3"
            />
          </svg>
        </motion.div>

        {/* Middle Ring */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-2"
        >
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={color}
              strokeWidth="3"
              strokeDasharray="30 15"
              opacity="0.5"
            />
          </svg>
        </motion.div>

        {/* Inner Ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-4"
        >
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={color}
              strokeWidth="4"
              strokeDasharray="40 20"
              opacity="0.8"
            />
          </svg>
        </motion.div>

        {/* Center Glow */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div 
            className={`w-1/3 h-1/3 rounded-full nen-${nenType}`}
            style={{
              backgroundColor: color,
              boxShadow: `0 0 30px ${color}, 0 0 60px ${color}`,
            }}
          />
        </motion.div>
      </div>

      {/* Loading Text */}
      {text && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="mt-4 font-cyber text-sm uppercase tracking-wider"
          style={{ color }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
}; 