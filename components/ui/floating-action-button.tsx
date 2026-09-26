'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Zap, Coffee } from 'lucide-react';

interface FloatingActionButtonProps {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  loading?: boolean;
}

export default function FloatingActionButton({
  onClick,
  children = "Let's Reimagine ✨",
  variant = 'primary',
  size = 'lg',
  className = '',
  disabled = false,
  loading = false
}: FloatingActionButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;

    // Create ripple effect
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newRipple = { id: Date.now(), x, y };

    setRipples(prev => [...prev, newRipple]);
    
    // Remove ripple after animation
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
    }, 600);

    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 150);

    onClick?.(e);
  };

  const variants = {
    primary: {
      background: 'linear-gradient(135deg, #8b00ff, #6600cc)',
      color: '#ffffff',
      shadow: '0 10px 30px rgba(139, 0, 255, 0.4)'
    },
    secondary: {
      background: 'rgba(255, 255, 255, 0.1)',
      color: '#ffffff',
      shadow: '0 10px 30px rgba(255, 255, 255, 0.1)'
    },
    success: {
      background: 'linear-gradient(135deg, #10b981, #059669)',
      color: '#ffffff',
      shadow: '0 10px 30px rgba(16, 185, 129, 0.4)'
    }
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  const currentVariant = variants[variant];
  const currentSize = sizes[size];

  return (
    <motion.button
      onClick={handleClick}
      disabled={disabled || loading}
      className={`
        relative overflow-hidden rounded-full font-semibold
        backdrop-filter backdrop-blur-lg border border-white/20
        transition-all duration-300 ease-out
        hover:scale-105 active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed
        disabled:hover:scale-100 disabled:active:scale-100
        ${currentSize} ${className}
      `}
      style={{
        background: currentVariant.background,
        color: currentVariant.color,
        boxShadow: currentVariant.shadow
      }}
      whileHover={{
        y: -2,
        boxShadow: disabled ? currentVariant.shadow : `0 15px 40px ${
          variant === 'primary' 
            ? 'rgba(139, 0, 255, 0.6)' 
            : variant === 'success'
            ? 'rgba(16, 185, 129, 0.6)'
            : 'rgba(255, 255, 255, 0.2)'
        }`
      }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      animate={{
        scale: isPressed ? 0.95 : 1
      }}
      transition={{ duration: 0.2 }}
    >
      {/* Glass effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-white/20 rounded-full" />
      
      {/* Ripple effects */}
      {ripples.map(ripple => (
        <motion.div
          key={ripple.id}
          className="absolute rounded-full bg-white/30"
          style={{
            left: ripple.x - 10,
            top: ripple.y - 10,
            width: 20,
            height: 20
          }}
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 4, opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      ))}

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center gap-2">
        {loading ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-5 h-5"
            >
              <div className="w-full h-full border-2 border-white/30 border-t-white rounded-full" />
            </motion.div>
            <span>Working...</span>
          </>
        ) : (
          <>
            {variant === 'primary' && <Sparkles className="w-5 h-5" />}
            {variant === 'secondary' && <Coffee className="w-5 h-5" />}
            {variant === 'success' && <Zap className="w-5 h-5" />}
            <span>{children}</span>
          </>
        )}
      </div>

      {/* Animated border glow */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(from 0deg, ${
            variant === 'primary' 
              ? '#8b00ff, #6600cc, #8b00ff' 
              : variant === 'success'
              ? '#10b981, #059669, #10b981'
              : '#ffffff, #ffffff80, #ffffff'
          })`,
          padding: '2px',
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude'
        }}
        animate={{
          rotate: [0, 360]
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear"
        }}
      />

      {/* Hover glow effect */}
      <motion.div
        className="absolute inset-0 rounded-full opacity-0"
        style={{
          background: `radial-gradient(circle, ${
            variant === 'primary' 
              ? 'rgba(139, 0, 255, 0.4)' 
              : variant === 'success'
              ? 'rgba(16, 185, 129, 0.4)'
              : 'rgba(255, 255, 255, 0.2)'
          } 0%, transparent 70%)`
        }}
        whileHover={{ opacity: 1, scale: 1.1 }}
        transition={{ duration: 0.3 }}
      />
    </motion.button>
  );
}