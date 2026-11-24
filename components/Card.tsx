import React from 'react';
import { motion } from 'framer-motion';
import { SlideData } from '../types';

interface CardProps {
  slide: SlideData;
  isActive: boolean;
  direction: number;
}

export const Card: React.FC<CardProps> = ({ slide, isActive, direction }) => {
  return (
    <div 
      className={`absolute inset-0 w-full h-full flex flex-col items-center justify-center p-6 transition-opacity duration-300 ${isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
    >
        <div className="relative w-full aspect-[3/4] max-h-[70vh] border-4 border-white bg-gray-900 shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] flex flex-col overflow-hidden select-none">
          
          {/* Image Container */}
          <div className="flex-1 min-h-0 w-full bg-black relative flex items-center justify-center overflow-hidden">
            {slide.imageUrl ? (
              <img 
                src={slide.imageUrl} 
                alt={slide.text}
                draggable={false}
                className="w-full h-full object-cover pointer-events-none select-none" 
              />
            ) : (
              <div className="text-gray-500 font-mono text-xs p-4 text-center">
                [Image Missing: The sun was too bright]
              </div>
            )}
            
            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
          </div>

          {/* Text Container */}
          <div className="shrink-0 bg-black p-6 border-t-4 border-white min-h-[120px] flex items-center justify-center">
             <h2 className="text-xl md:text-2xl font-bold font-mono text-center leading-tight text-[#ffff00] drop-shadow-md">
                {slide.text}
             </h2>
          </div>
        </div>
        
        <div className="mt-8 text-white/50 text-xs font-mono animate-bounce">
          {isActive && "← SWIPE →"}
        </div>
    </div>
  );
};
