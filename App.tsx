import React, { useState, useEffect, useRef } from 'react';
import { Play, Home, ChevronRight, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { generateStoryboard, generateSlideImage } from './services/geminiService';
import { GameState, SlideData, StoryboardResponse } from './types';
import { LoadingScreen } from './components/LoadingScreen';
import { Card } from './components/Card';

const SWIPE_THRESHOLD = 100;

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.HOME);
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [gameTitle, setGameTitle] = useState("HISTORY OF STUFF");
  const [conclusionText, setConclusionText] = useState("And then we died.");
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Audio Context for sound effects (simulated with Web Audio API for "jingles")
  const audioContextRef = useRef<AudioContext | null>(null);

  const playSound = (freq: number, type: 'square' | 'sine' | 'sawtooth' = 'square', duration: number = 0.1) => {
    if (!soundEnabled) return;
    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    if(ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  };

  const playSwipeSound = () => {
      playSound(300, 'sine', 0.1);
      setTimeout(() => playSound(400, 'sine', 0.1), 50);
  };
  
  const playStartSound = () => {
    playSound(200, 'square', 0.1);
    setTimeout(() => playSound(400, 'square', 0.1), 100);
    setTimeout(() => playSound(600, 'square', 0.4), 200);
  };

  const startGame = async () => {
    setGameState(GameState.LOADING);
    setLoadingProgress(0);
    setLoadingStatus("Consulting the timeline...");
    playStartSound();

    try {
      // 1. Generate Storyboard
      const storyboard: StoryboardResponse = await generateStoryboard();
      setGameTitle(storyboard.title.toUpperCase());
      setConclusionText(storyboard.conclusion);
      
      const initialSlides: SlideData[] = storyboard.slides.map((s, i) => ({
        id: i,
        text: s.text,
        imagePrompt: s.imagePrompt,
      }));
      setSlides(initialSlides);
      
      // 2. Generate Images
      // We will generate them in parallel batches to speed it up, or sequential for progress bar
      const updatedSlides = [...initialSlides];
      const total = initialSlides.length;
      
      for (let i = 0; i < total; i++) {
        setLoadingStatus(`Painting history... (${i + 1}/${total})`);
        const imageUrl = await generateSlideImage(updatedSlides[i].imagePrompt);
        updatedSlides[i].imageUrl = imageUrl;
        setSlides([...updatedSlides]); // Update state incrementally
        setLoadingProgress(i + 1);
      }

      setGameState(GameState.PLAYING);
      setCurrentIndex(0);
    } catch (error) {
      console.error("Game gen failed", error);
      setLoadingStatus("Failed to load history. Try again.");
      setTimeout(() => setGameState(GameState.HOME), 2000);
    }
  };

  const handleDragEnd = (event: any, info: PanInfo) => {
    if (info.offset.x < -SWIPE_THRESHOLD) {
      // Swipe Left (Next)
      playSwipeSound();
      if (currentIndex < slides.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setGameState(GameState.CONCLUSION);
      }
    } else if (info.offset.x > SWIPE_THRESHOLD) {
      // Swipe Right (Prev)
      playSwipeSound();
      if (currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      }
    }
  };

  const resetGame = () => {
    setGameState(GameState.HOME);
    setSlides([]);
    setCurrentIndex(0);
  };

  const replayGame = () => {
    setCurrentIndex(0);
    setGameState(GameState.PLAYING);
  };

  // --- RENDER HELPERS ---

  if (gameState === GameState.LOADING) {
    return <LoadingScreen progress={loadingProgress} total={slides.length || 8} status={loadingStatus} />;
  }

  if (gameState === GameState.HOME) {
    return (
      <div className="h-full w-full bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-10 left-10 w-20 h-20 border-4 border-[#ffff00] rounded-full animate-bounce opacity-50" />
        <div className="absolute bottom-20 right-10 w-32 h-32 border-4 border-[#ff00ff] rotate-45 animate-pulse opacity-50" />
        <div className="absolute top-1/2 left-1/4 w-4 h-4 bg-white rounded-full animate-ping" />
        
        <h1 className="text-4xl md:text-6xl font-black font-mono text-center mb-8 leading-tight">
          <span className="block text-[#ff00ff] drop-shadow-[4px_4px_0_rgba(255,255,255,1)]">HISTORY</span>
          <span className="block text-white text-2xl my-2">OF</span>
          <span className="block text-[#00ff00] drop-shadow-[4px_4px_0_rgba(255,255,255,1)]">EVERYTHING</span>
        </h1>
        
        <p className="text-gray-400 font-mono mb-12 text-center max-w-md">
          AI generated slides-book based on that one famous story of all things!
        </p>

        <button 
          onClick={startGame}
          className="group relative px-8 py-4 bg-white text-black font-bold font-mono text-xl uppercase tracking-wider hover:bg-[#ffff00] transition-colors shadow-[8px_8px_0px_0px_#ff00ff] active:translate-y-1 active:shadow-none"
        >
          <span className="flex items-center gap-2">
            Generate <Play className="w-6 h-6" />
          </span>
        </button>

        <button 
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="absolute top-6 right-6 text-white/50 hover:text-white"
        >
          {soundEnabled ? <Volume2 /> : <VolumeX />}
        </button>
      </div>
    );
  }

  if (gameState === GameState.CONCLUSION) {
     return (
      <div className="h-full w-full bg-[#ff00ff] flex flex-col items-center justify-center p-6 relative text-black">
        <h2 className="text-4xl font-black font-mono text-center mb-8 text-white drop-shadow-[4px_4px_0_rgba(0,0,0,1)]">
          THE END
        </h2>
        
        <div className="bg-black text-white p-6 border-4 border-white mb-8 max-w-xs text-center font-mono">
           {conclusionText}
        </div>

        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button 
            onClick={replayGame}
            className="w-full px-8 py-4 bg-white text-black font-bold font-mono text-xl uppercase tracking-wider hover:bg-[#00ff00] transition-colors shadow-[8px_8px_0px_0px_#000000] active:translate-y-1 active:shadow-none"
          >
             <span className="flex items-center justify-center gap-2">
              View story again <RefreshCw className="w-6 h-6" />
            </span>
          </button>

          <button 
            onClick={resetGame}
            className="w-full px-8 py-4 bg-black text-white font-bold font-mono text-xl uppercase tracking-wider hover:bg-gray-800 transition-colors shadow-[8px_8px_0px_0px_#ffffff] active:translate-y-1 active:shadow-none border-2 border-white"
          >
             <span className="flex items-center justify-center gap-2">
              Finish <Home className="w-6 h-6" />
            </span>
          </button>
        </div>
      </div>
     );
  }

  // PLAYING STATE
  return (
    <div className="h-full w-full bg-black relative overflow-hidden flex flex-col">
       {/* Header */}
       <div className="h-16 flex items-center justify-between px-6 z-20 bg-black/50 backdrop-blur-sm border-b border-white/10">
          <span className="font-mono text-[#00ff00] text-sm truncate max-w-[200px]">{gameTitle}</span>
          <div className="flex gap-1">
             {slides.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-2 w-2 rounded-full transition-colors ${i === currentIndex ? 'bg-[#ff00ff]' : 'bg-white/20'}`} 
                />
             ))}
          </div>
       </div>

       {/* Slides Area */}
       <div className="flex-1 relative w-full flex items-center justify-center overflow-hidden">
         <AnimatePresence initial={false} custom={currentIndex}>
           <motion.div
             key={currentIndex}
             custom={currentIndex}
             initial={{ opacity: 0, x: 300, scale: 0.8 }}
             animate={{ opacity: 1, x: 0, scale: 1 }}
             exit={{ opacity: 0, x: -300, scale: 0.8 }}
             transition={{ type: "spring", stiffness: 300, damping: 30 }}
             drag="x"
             dragConstraints={{ left: 0, right: 0 }}
             dragElastic={1}
             onDragEnd={handleDragEnd}
             className="absolute w-full h-full flex items-center justify-center p-4 max-w-md mx-auto"
           >
              {slides[currentIndex] && (
                <Card 
                  slide={slides[currentIndex]} 
                  isActive={true} 
                  direction={0} 
                />
              )}
           </motion.div>
         </AnimatePresence>
       </div>

       {/* Safe Area Bottom Spacer for mobile home bars */}
       <div className="h-8 w-full bg-black/50" />
    </div>
  );
}