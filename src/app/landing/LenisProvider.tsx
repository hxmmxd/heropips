'use client';

import { useEffect, ReactNode } from 'react';
import Lenis from 'lenis';

interface LenisProviderProps {
  children: ReactNode;
}

export default function LenisProvider({ children }: LenisProviderProps) {
  useEffect(() => {
    // Enable scrolling on html and body for landing page
    document.documentElement.classList.add('lp-scrollable');
    document.body.classList.add('lp-scrollable');

    // Initialize Lenis smooth scroll
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // smooth exponential ease
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
    });

    // RequestAnimationFrame loop
    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    // Cleanup on unmount
    return () => {
      document.documentElement.classList.remove('lp-scrollable');
      document.body.classList.remove('lp-scrollable');
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
