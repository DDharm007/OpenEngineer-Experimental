'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Palette, Sparkles, Layers, Zap, Grid, Heart, Star, Camera } from 'lucide-react';

export interface StyleOption {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  gradient: string;
  example: string;
  tags?: string[];
}

interface StyleSelectorProps {
  selectedStyle: string | null;
  onStyleSelect: (styleId: string) => void;
  className?: string;
}

const styleOptions: StyleOption[] = [
  {
    id: 'modern',
    name: 'Modern',
    description: 'Clean lines, minimalist design, sophisticated spacing',
    icon: Grid,
    gradient: 'from-blue-500 to-purple-600',
    example: 'Cursor, Linear, Stripe',
    tags: ['Clean', 'Minimal', 'Professional']
  },
  {
    id: 'neobrutalism',
    name: 'Neobrutalism',
    description: 'Bold shadows, vibrant colors, playful typography',
    icon: Zap,
    gradient: 'from-yellow-400 to-red-500',
    example: 'Figma, Gumroad, Dribbble',
    tags: ['Bold', 'Vibrant', 'Edgy']
  },
  {
    id: 'glassmorphism',
    name: 'Glassmorphism',
    description: 'Frosted glass effects, transparency, depth',
    icon: Layers,
    gradient: 'from-cyan-400 to-blue-500',
    example: 'Apple, Notion, Discord',
    tags: ['Glass', 'Transparent', 'Elegant']
  },
  {
    id: 'retro',
    name: 'Retro Futurism',
    description: 'Neon glows, synthwave aesthetics, nostalgic vibes',
    icon: Star,
    gradient: 'from-pink-500 to-purple-500',
    example: 'Spotify, Synthwave Art, Cyberpunk',
    tags: ['Neon', 'Nostalgic', 'Vibrant']
  },
  {
    id: 'organic',
    name: 'Organic',
    description: 'Curved edges, natural colors, flowing layouts',
    icon: Heart,
    gradient: 'from-green-400 to-emerald-500',
    example: 'Airbnb, Headspace, Calm',
    tags: ['Natural', 'Curved', 'Soft']
  },
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'Typography-focused, magazine-style, content-rich',
    icon: Camera,
    gradient: 'from-gray-700 to-gray-900',
    example: 'Medium, The Verge, NYTimes',
    tags: ['Typography', 'Clean', 'Content']
  }
];

export default function StyleSelector({ selectedStyle, onStyleSelect, className = '' }: StyleSelectorProps) {
  return (
    <div className={`${className}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-4"
      >
        <h3 className="text-sm font-medium text-white/90 mb-2 flex items-center gap-2">
          <Palette className="w-4 h-4" />
          Choose Design Style
        </h3>
        <p className="text-xs text-white/60">
          Select a design aesthetic that resonates with your vision
        </p>
      </motion.div>

      <div className="grid grid-cols-2 gap-3">
        {styleOptions.map((style, index) => {
          const Icon = style.icon;
          const isSelected = selectedStyle === style.id;

          return (
            <motion.button
              key={style.id}
              onClick={() => onStyleSelect(style.id)}
              className={`
                relative overflow-hidden rounded-xl p-4 text-left
                backdrop-filter backdrop-blur-lg border transition-all duration-300 ease-out
                ${isSelected 
                  ? 'bg-white/15 border-white/30 shadow-lg' 
                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                }
              `}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Background gradient */}
              <div className={`
                absolute inset-0 opacity-10 transition-opacity duration-300
                bg-gradient-to-br ${style.gradient}
                ${isSelected ? 'opacity-20' : 'opacity-0 group-hover:opacity-10'}
              `} />

              {/* Content */}
              <div className="relative z-10">
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <motion.div
                    className={`
                      w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300
                      ${isSelected 
                        ? `bg-gradient-to-br ${style.gradient} text-white shadow-lg` 
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }
                    `}
                    animate={isSelected ? {
                      scale: [1, 1.1, 1],
                      rotate: [0, 3, -3, 0]
                    } : {}}
                    transition={{ duration: 0.5, repeat: isSelected ? Infinity : 0, repeatDelay: 3 }}
                  >
                    <Icon className="w-4 h-4" />
                  </motion.div>

                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className="w-5 h-5 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center"
                    >
                      <Sparkles className="w-3 h-3 text-white" />
                    </motion.div>
                  )}
                </div>

                {/* Title */}
                <h4 className={`font-semibold text-sm mb-1 transition-colors duration-300 ${
                  isSelected ? 'text-white' : 'text-white/90'
                }`}>
                  {style.name}
                </h4>

                {/* Description */}
                <p className={`text-xs mb-2 transition-colors duration-300 ${
                  isSelected ? 'text-white/80' : 'text-white/60'
                }`}>
                  {style.description}
                </p>

                {/* Example brands */}
                <div className={`text-xs transition-colors duration-300 ${
                  isSelected ? 'text-purple-300' : 'text-white/50'
                }`}>
                  <span className="italic">e.g. {style.example}</span>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {style.tags?.slice(0, 2).map((tag, tagIndex) => (
                    <span
                      key={tag}
                      className={`
                        px-2 py-0.5 rounded-full text-xs transition-all duration-300
                        ${isSelected 
                          ? 'bg-white/20 text-white/90' 
                          : 'bg-white/10 text-white/60'
                        }
                      `}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Selection indicator */}
              {isSelected && (
                <motion.div
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background: `conic-gradient(from 0deg, ${style.gradient.replace('from-', '').replace(' to-', ', ')}, transparent, ${style.gradient.replace('from-', '').replace(' to-', ', ')})`,
                    padding: '1px',
                    mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    maskComposite: 'exclude'
                  }}
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                />
              )}

              {/* Hover shimmer effect */}
              <motion.div
                className="absolute inset-0 opacity-0"
                style={{
                  background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)',
                  transform: 'translateX(-100%)'
                }}
                whileHover={{
                  opacity: [0, 1, 0],
                  transform: ['translateX(-100%)', 'translateX(100%)']
                }}
                transition={{ duration: 0.6 }}
              />
            </motion.button>
          );
        })}
      </div>

      {/* Selected style info */}
      {selectedStyle && (
        <motion.div
          className="mt-4 p-3 rounded-lg bg-black/20 backdrop-blur-sm border border-white/10"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span className="text-xs font-medium text-purple-400">Style Selected</span>
          </div>
          <p className="text-xs text-white/70 italic">
            {selectedStyle === 'modern' && "\"Simplicity is the ultimate sophistication. Less, but better.\""}
            {selectedStyle === 'neobrutalism' && "\"Bold choices create memorable experiences. Dare to be different.\""}
            {selectedStyle === 'glassmorphism' && "\"Transparency reveals truth. Beauty lies in the layers between.\""}
            {selectedStyle === 'retro' && "\"The future as imagined by the past. Neon dreams and digital nostalgia.\""}
            {selectedStyle === 'organic' && "\"Nature knows no straight lines. Embrace the curves of life.\""}
            {selectedStyle === 'editorial' && "\"Content is king. Typography is the crown that makes it royal.\""}
          </p>
        </motion.div>
      )}
    </div>
  );
}