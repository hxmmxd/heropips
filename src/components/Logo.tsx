import React from 'react';

export function LogoMark({ className = '', size = 32 }: { className?: string; size?: number }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 64 64" 
      width={size} 
      height={size}
      className={className}
    >
      <rect width="64" height="64" rx="16" className="fill-[var(--logo-bg)] transition-colors duration-300" />
      <path 
        d="M18 30 L32 16 L46 30" 
        fill="none" 
        className="stroke-[var(--logo-fg)] transition-colors duration-300" 
        strokeWidth="9" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <path 
        d="M18 47 L32 33 L46 47" 
        fill="none" 
        className="stroke-[var(--logo-fg)] transition-colors duration-300" 
        strokeWidth="9" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
    </svg>
  );
}

export function Logo({ className = '', size = 32, showWordmark = true }: { className?: string; size?: number, showWordmark?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <LogoMark size={size} />
      {showWordmark && (
        <span 
          style={{ 
            fontFamily: 'var(--font-display)', 
            fontWeight: 700, 
            fontSize: `${Math.max(16, size * 0.65)}px`, 
            letterSpacing: '-0.04em' 
          }}
          className="text-[var(--text-hi)] transition-colors duration-300"
        >
          heropips
        </span>
      )}
    </div>
  );
}
