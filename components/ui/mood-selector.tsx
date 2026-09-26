'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Moon, Zap, Sparkles, Heart, Coffee, Sun } from 'lucide-react';

export type MoodType = 'calm' | 'energetic' | 'retro';

interface MoodSelectorProps {
  selectedMood: MoodType;
  onMoodChange: (mood: MoodType) => void;
  className?: string;
}

const moods = [
  {
    id: 'calm' as MoodType,
    name: 'Calm',
    description: 'Peaceful gradients and gentle movements',
    icon: Moon,
    color: 'from-purple-500 to-blue-500',
    bgColor: 'bg-purple-500/20',
    hoverColor: 'hover:bg-purple-500/30'
  },
  {
    id: 'energetic' as MoodType,
    name: 'Energetic',
    description: 'Vibrant colors and dynamic animations',
    icon: Zap,
    color: 'from-pink-500 to-orange-500',
    bgColor: 'bg-pink-500/20',
    hoverColor: 'hover:bg-pink-500/30'
  },
  {
    id: 'retro' as MoodType,
    name: 'Retro',
    description: 'Nostalgic vibes with neon aesthetics',
    icon: Sparkles,
    color: 'from-cyan-500 to-green-500',
    bgColor: 'bg-cyan-500/20',
    hoverColor: 'hover:bg-cyan-500/30'
  }
];

export default function MoodSelector({ selectedMood, onMoodChange, className = '' }: MoodSelectorProps) {
  return (
    <div className={`${className}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-4"
      >
        <h3 className="text-sm font-medium text-white/80 mb-2 flex items-center gap-2">
          <Heart className="w-4 h-4" />
          Choose Your Vibe
        </h3>
        <p className="text-xs text-white/60">
          Select an animation style that matches your creative energy
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-3">
        {moods.map((mood, index) => {
          const Icon = mood.icon;
          const isSelected = selectedMood === mood.id;

          return (
            <motion.button
              key={mood.id}
              onClick={() => onMoodChange(mood.id)}
              className={`
                relative overflow-hidden rounded-xl p-4 text-left
                backdrop-filter backdrop-blur-lg border border-white/10
                transition-all duration-300 ease-out
                ${isSelected 
                  ? 'bg-white/20 border-white/30 shadow-lg' 
                  : 'bg-white/5 hover:bg-white/10 hover:border-white/20'
                }
              `}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Background gradient */}
              <div className={`
                absolute inset-0 opacity-20 transition-opacity duration-300
                bg-gradient-to-r ${mood.color}
                ${isSelected ? 'opacity-30' : 'opacity-0 group-hover:opacity-20'}
              `} />

              {/* Content */}
              <div className="relative z-10 flex items-start gap-3">
                {/* Icon */}
                <motion.div
                  className={`
                    flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center
                    ${isSelected ? mood.bgColor : 'bg-white/10'}
                    ${isSelected ? '' : mood.hoverColor}
                    transition-all duration-300
                  `}
                  animate={isSelected ? {
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0]
                  } : {}}
                  transition={{ duration: 0.6, repeat: isSelected ? Infinity : 0, repeatDelay: 2 }}
                >
                  <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-white/70'}`} />
                </motion.div>

                {/* Text content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={`font-medium text-sm ${isSelected ? 'text-white' : 'text-white/90'}`}>
                      {mood.name}
                    </h4>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-400 to-pink-400"
                      />
                    )}
                  </div>
                  <p className={`text-xs ${isSelected ? 'text-white/80' : 'text-white/60'}`}>
                    {mood.description}
                  </p>
                </div>
              </div>

              {/* Selection indicator */}
              {isSelected && (
                <motion.div
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background: `conic-gradient(from 0deg, rgba(139, 0, 255, 0.3), rgba(255, 20, 147, 0.3), rgba(139, 0, 255, 0.3))`,
                    padding: '1px',
                    mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    maskComposite: 'exclude'
                  }}
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                />
              )}

              {/* Hover effect */}
              <motion.div
                className="absolute inset-0 rounded-xl opacity-0"
                style={{
                  background: `radial-gradient(circle at center, ${mood.color.replace('from-', '').replace(' to-', ', ')}, transparent 70%)`
                }}
                whileHover={{ opacity: 0.1 }}
                transition={{ duration: 0.3 }}
              />
            </motion.button>
          );
        })}
      </div>

      {/* Poetic microcopy */}
      <motion.div
        className="mt-4 p-3 rounded-lg bg-black/20 backdrop-blur-sm border border-white/10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Coffee className="w-3 h-3 text-yellow-400" />
          <span className="text-xs font-medium text-yellow-400">Creative Tip</span>
        </div>
        <p className="text-xs text-white/70 italic">
          {selectedMood === 'calm' && "\"Breathe deep. Let creativity flow like a gentle stream.\""}
          {selectedMood === 'energetic' && "\"Unleash your vision! Every pixel dances with possibility.\""}
          {selectedMood === 'retro' && "\"Embrace the neon dreams of digital yesterdays.\""}
        </p>
      </motion.div>
    </div>
  );
}