'use client';

import { useEffect, useState, useRef } from 'react';

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

export default function ScrollProgressRail() {
  const [progress, setProgress] = useState(0);
  const prevFilledSegments = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      // Calculate how far down the page the user has scrolled
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      
      // Calculate percentage (0 to 1)
      const scrollableDistance = documentHeight - windowHeight;
      if (scrollableDistance <= 0) {
        setProgress(0);
        return;
      }
      
      const currentProgress = Math.max(0, Math.min(1, scrollTop / scrollableDistance));
      setProgress(currentProgress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Initial check
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Number of segments in the rail
  const totalSegments = 40;
  
  // Calculate how many segments should be "filled"
  const filledSegments = Math.round(progress * totalSegments);

  // Trigger Haptics and Audio when a new segment is crossed
  useEffect(() => {
    if (filledSegments !== prevFilledSegments.current) {
      const newSegment = filledSegments;
      const oldSegment = prevFilledSegments.current;
      prevFilledSegments.current = filledSegments;
      
      if (newSegment > oldSegment) {
        if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
          window.navigator.vibrate(2); // Ultra-light, 2ms tap
        }
        playClickAudio(true);
      }
    }
  }, [filledSegments]);

  return (
    <div className="flex flex-col gap-[3px] py-4" style={{ width: '24px' }}>
      {Array.from({ length: totalSegments }).map((_, index) => {
        // Since we render from top to bottom, index 0 is the top segment.
        const isFilled = index < filledSegments;
        
        return (
          <div
            key={index}
            className={`w-full h-[3px] rounded-[2px] transition-all duration-100 ease-out ${
              isFilled
                ? 'bg-gray-900 shadow-[0_0_8px_rgba(17,24,39,0.3)] dark:bg-[#C6FF2E] dark:shadow-[0_0_12px_rgba(198,255,46,0.6)]'
                : 'bg-gray-200 dark:bg-gray-800'
            }`}
          />
        );
      })}
    </div>
  );
}
