'use client';

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface AnimatedBackgroundProps {
  variant?: 'gradient' | 'particles' | 'minimal';
  mood?: 'calm' | 'energetic' | 'retro';
  className?: string;
}

export default function AnimatedBackground({ 
  variant = 'gradient', 
  mood = 'calm',
  className = '' 
}: AnimatedBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (variant !== 'particles') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Particle system
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      color: string;
    }> = [];

    const colors = mood === 'calm' 
      ? ['rgba(139, 0, 255, 0.3)', 'rgba(102, 0, 204, 0.2)', 'rgba(75, 0, 130, 0.1)']
      : mood === 'energetic'
      ? ['rgba(255, 20, 147, 0.4)', 'rgba(255, 69, 0, 0.3)', 'rgba(255, 215, 0, 0.2)']
      : ['rgba(0, 255, 255, 0.3)', 'rgba(255, 20, 147, 0.2)', 'rgba(50, 205, 50, 0.1)'];

    // Initialize particles
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * (mood === 'energetic' ? 2 : 0.5),
        vy: (Math.random() - 0.5) * (mood === 'energetic' ? 2 : 0.5),
        size: Math.random() * 3 + 1,
        alpha: Math.random() * 0.5 + 0.2,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(particle => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Wrap around edges
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        // Draw particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.fill();

        // Connect nearby particles
        particles.forEach(other => {
          const distance = Math.sqrt(
            Math.pow(particle.x - other.x, 2) + Math.pow(particle.y - other.y, 2)
          );
          if (distance < 100) {
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = `rgba(139, 0, 255, ${0.1 * (1 - distance / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [variant, mood]);

  if (variant === 'particles') {
    return (
      <div className={`fixed inset-0 pointer-events-none ${className}`}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ zIndex: 1 }}
        />
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <div className={`fixed inset-0 pointer-events-none ${className}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-900" />
      </div>
    );
  }

  // Default gradient variant
  return (
    <div className={`fixed inset-0 pointer-events-none ${className}`}>
      {/* Base gradient */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: mood === 'calm' 
            ? [
                'linear-gradient(135deg, #000000 0%, #1a0033 25%, #330066 50%, #6600cc 75%, #8b00ff 100%)',
                'linear-gradient(135deg, #1a0033 0%, #330066 25%, #6600cc 50%, #8b00ff 75%, #aa44ff 100%)',
                'linear-gradient(135deg, #000000 0%, #1a0033 25%, #330066 50%, #6600cc 75%, #8b00ff 100%)'
              ]
            : mood === 'energetic'
            ? [
                'linear-gradient(135deg, #ff1493 0%, #ff6347 25%, #ffd700 50%, #ff4500 75%, #dc143c 100%)',
                'linear-gradient(135deg, #ff6347 0%, #ffd700 25%, #ff4500 50%, #dc143c 75%, #ff1493 100%)',
                'linear-gradient(135deg, #ff1493 0%, #ff6347 25%, #ffd700 50%, #ff4500 75%, #dc143c 100%)'
              ]
            : [
                'linear-gradient(135deg, #00ffff 0%, #ff1493 25%, #32cd32 50%, #ff69b4 75%, #40e0d0 100%)',
                'linear-gradient(135deg, #ff1493 0%, #32cd32 25%, #ff69b4 50%, #40e0d0 75%, #00ffff 100%)',
                'linear-gradient(135deg, #00ffff 0%, #ff1493 25%, #32cd32 50%, #ff69b4 75%, #40e0d0 100%)'
              ]
        }}
        transition={{
          duration: mood === 'energetic' ? 3 : mood === 'retro' ? 6 : 8,
          repeat: Infinity,
          ease: "linear"
        }}
      />

      {/* Floating orbs */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full mix-blend-screen filter blur-xl opacity-70"
          style={{
            width: `${200 + i * 100}px`,
            height: `${200 + i * 100}px`,
            background: `radial-gradient(circle, ${
              mood === 'calm' 
                ? 'rgba(139, 0, 255, 0.3)' 
                : mood === 'energetic'
                ? 'rgba(255, 20, 147, 0.4)'
                : 'rgba(0, 255, 255, 0.3)'
            } 0%, transparent 70%)`
          }}
          animate={{
            x: ['-20%', '120%', '-20%'],
            y: ['20%', '80%', '20%'],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: mood === 'energetic' ? 15 + i * 3 : 25 + i * 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 2
          }}
        />
      ))}

      {/* Mesh gradient overlay */}
      <motion.div
        className="absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(circle at 20% 80%, ${
            mood === 'calm' ? '#8b00ff' : mood === 'energetic' ? '#ff1493' : '#00ffff'
          } 0%, transparent 50%), 
                      radial-gradient(circle at 80% 20%, ${
            mood === 'calm' ? '#6600cc' : mood === 'energetic' ? '#ff4500' : '#ff1493'
          } 0%, transparent 50%), 
                      radial-gradient(circle at 40% 40%, ${
            mood === 'calm' ? '#4b0082' : mood === 'energetic' ? '#ffd700' : '#32cd32'
          } 0%, transparent 50%)`
        }}
        animate={{
          opacity: [0.2, 0.4, 0.2]
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </div>
  );
}