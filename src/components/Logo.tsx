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
      <rect x="8" y="8" width="48" height="48" rx="12" fill="#C6FF2E" />
      <path d="M20 32 L32 20 L44 32" fill="none" stroke="#0D0F07" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 45 L32 33 L44 45" fill="none" stroke="#0D0F07" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
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
