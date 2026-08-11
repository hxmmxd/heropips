'use client';

import { useEffect, useState, useRef } from 'react';

// Singleton AudioContext so we don't create hundreds of them
let audioCtx: AudioContext | null = null;

const playClickAudio = (isTick: boolean) => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      if (ctx.state === "suspended") ctx.resume();

      const now = ctx.currentTime;
      const freq = isTick ? 6800 : 5400;     // Main frequency
      const vol  = isTick ? 0.08 : 0.055;    // Volume
      const ringHz = freq * 2.05;            // Ring tone frequency

      // Master gain
      const master = ctx.createGain();
      master.gain.setValueAtTime(vol, now);
      master.connect(ctx.destination);

      // --- Noise burst (the "click" body) ---
      const len = Math.floor(ctx.sampleRate * 0.012);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.1));
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;

      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 4200;

      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = freq;
      bp.Q.value = 22;

      const ng = ctx.createGain();
      ng.gain.setValueAtTime(1, now);
      ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);

      src.connect(hp); hp.connect(bp); bp.connect(ng); ng.connect(master);
      src.start(now);
      src.stop(now + 0.018);

      // --- Sine ring tone (the "ting" tail) ---
      const ring = ctx.createOscillator();
      ring.type = "sine";
      ring.frequency.setValueAtTime(ringHz, now);
      ring.frequency.exponentialRampToValueAtTime(ringHz * 0.88, now + 0.04);

      const rg = ctx.createGain();
      rg.gain.setValueAtTime(isTick ? 0.04 : 0.025, now);
      rg.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

      ring.connect(rg); rg.connect(master);
      ring.start(now);
      ring.stop(now + 0.05);
    } catch (e) {}
  };

export default function MobileScrollProgressRail() {
  const [progress, setProgress] = useState(0);
  const prevFilledSegments = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      
      const scrollableDistance = documentHeight - windowHeight;
      if (scrollableDistance <= 0) {
        setProgress(0);
        return;
      }
      
      const currentProgress = Math.max(0, Math.min(1, scrollTop / scrollableDistance));
      setProgress(currentProgress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Number of horizontal segments across the screen
  const totalSegments = 40;
  const filledSegments = Math.round(progress * totalSegments);

  // Trigger Haptics and Audio when a new segment is crossed
  useEffect(() => {
    if (filledSegments !== prevFilledSegments.current) {
      const newSegment = filledSegments;
      const oldSegment = prevFilledSegments.current;
      prevFilledSegments.current = filledSegments;
      
      if (newSegment > oldSegment) {
        // Haptic Feedback (Supported primarily on Android)
        if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
          window.navigator.vibrate(2); // Ultra-light, 2ms tap
        }
        
        // Watch Gear Sound
        playClickAudio(true);
      }
    }
  }, [filledSegments]);

  return (
    <div 
      className="fixed top-0 left-0 w-full z-50 flex flex-row gap-[2px] lg:hidden"
      style={{ height: '3px' }}
    >
      {Array.from({ length: totalSegments }).map((_, index) => {
        const isFilled = index < filledSegments;
        
        return (
          <div
            key={index}
            className={`flex-1 h-full transition-all duration-100 ease-out ${
              isFilled
                ? 'bg-gray-900 shadow-[0_0_8px_rgba(17,24,39,0.3)] dark:bg-[#C6FF2E] dark:shadow-[0_0_12px_rgba(198,255,46,0.6)]'
                : 'bg-gray-200/50 dark:bg-gray-800'
            }`}
          />
        );
      })}
    </div>
  );
}
