'use client';

import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export default function TiltCard({ children, className = '', style = {} }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);

  // Relative cursor coordinates from 0 to 1
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);

  // Rotation angles with smooth spring feedback
  const rotateX = useSpring(useTransform(y, [0, 1], [6, -6]), { stiffness: 180, damping: 20 });
  const rotateY = useSpring(useTransform(x, [0, 1], [-6, 6]), { stiffness: 180, damping: 20 });

  // Glare overlay reflecting coordinate movement
  const glareBg = useTransform(
    [x, y],
    (values) => {
      const latestX = values[0] as number;
      const latestY = values[1] as number;
      return `radial-gradient(circle 240px at ${latestX * 100}% ${latestY * 100}%, rgba(255, 255, 255, 0.12), transparent 75%)`;
    }
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const relativeX = (e.clientX - rect.left) / rect.width;
    const relativeY = (e.clientY - rect.top) / rect.height;

    x.set(relativeX);
    y.set(relativeY);
  };

  const handleMouseEnter = () => {
    setHovering(true);
  };

  const handleMouseLeave = () => {
    setHovering(false);
    // Reset card tilt to flat
    x.set(0.5);
    y.set(0.5);
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{
        ...style,
        transformStyle: 'preserve-3d',
        rotateX,
        rotateY,
        perspective: 1000,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {/* Glare overlay sheen */}
      <motion.div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: glareBg,
          pointerEvents: 'none',
          zIndex: 10,
          mixBlendMode: 'overlay',
          opacity: hovering ? 1 : 0,
          transition: 'opacity 0.25s ease',
          borderRadius: 'inherit',
        }}
      />
    </motion.div>
  );
}
