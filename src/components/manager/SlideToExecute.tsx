'use client';

import React, { useState, useRef, useCallback } from 'react';

interface SlideToExecuteProps {
  direction: 'BUY' | 'SELL';
  onExecute: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export default function SlideToExecute({ direction, onExecute, disabled, loading }: SlideToExecuteProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [executed, setExecuted] = useState(false);

  const THRESHOLD = 0.85; // Must drag 85% to execute

  const handleStart = useCallback((clientX: number) => {
    if (disabled || loading || executed) return;
    setDragging(true);
  }, [disabled, loading, executed]);

  const handleMove = useCallback((clientX: number) => {
    if (!dragging || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const handleWidth = 56;
    const maxDrag = rect.width - handleWidth;
    const x = Math.max(0, Math.min(clientX - rect.left - handleWidth / 2, maxDrag));
    setDragX(x);
  }, [dragging]);

  const handleEnd = useCallback(() => {
    if (!dragging || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const handleWidth = 56;
    const maxDrag = rect.width - handleWidth;
    const progress = dragX / maxDrag;

    if (progress >= THRESHOLD) {
      setExecuted(true);
      setDragX(maxDrag);
      onExecute();
    } else {
      setDragX(0);
    }
    setDragging(false);
  }, [dragging, dragX, onExecute]);

  const progress = trackRef.current
    ? dragX / (trackRef.current.getBoundingClientRect().width - 56)
    : 0;

  const isBuy = direction === 'BUY';
  const baseColor = isBuy ? '34, 197, 94' : '239, 68, 68';
  const label = executed ? (loading ? 'Executing...' : '✓ Executed') : `Slide to ${direction}`;

  return (
    <div
      ref={trackRef}
      className="ste-track"
      style={{
        '--ste-color': baseColor,
        '--ste-progress': progress,
      } as React.CSSProperties}
      onMouseDown={(e) => handleStart(e.clientX)}
      onMouseMove={(e) => handleMove(e.clientX)}
      onMouseUp={handleEnd}
      onMouseLeave={() => { if (dragging) handleEnd(); }}
      onTouchStart={(e) => handleStart(e.touches[0].clientX)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX)}
      onTouchEnd={handleEnd}
    >
      {/* Fill behind handle */}
      <div className="ste-fill" style={{ width: dragX + 56 }} />

      {/* Handle */}
      <div
        className={`ste-handle ${executed ? 'ste-handle-done' : ''} ${dragging ? 'ste-handle-dragging' : ''}`}
        style={{ transform: `translateX(${dragX}px)` }}
      >
        {executed ? (
          loading ? (
            <span className="ste-spinner" />
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
              <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>

      {/* Label */}
      <span className="ste-label" style={{ opacity: executed ? 1 : 1 - progress * 2 }}>
        {label}
      </span>
    </div>
  );
}
