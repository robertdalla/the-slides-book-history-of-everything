import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  progress: number;
  total: number;
  status: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ progress, total, status }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-black text-white p-8 text-center space-y-8 animate-pulse">
      <div className="relative">
        <Loader2 className="w-16 h-16 animate-spin text-neon-pink" color="#ff00ff" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs font-mono">
          {Math.round((progress / total) * 100)}%
        </div>
      </div>
      
      <div className="space-y-4 max-w-xs">
        <h2 className="text-xl font-bold font-mono text-neon-green text-[#00ff00]">
          GENERATING HISTORY
        </h2>
        <p className="text-sm font-mono text-gray-400">
          {status}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-4 border-2 border-white max-w-[200px]">
        <div 
          className="h-full bg-[#ff00ff] transition-all duration-300 ease-out"
          style={{ width: `${(progress / total) * 100}%` }}
        />
      </div>
    </div>
  );
};
