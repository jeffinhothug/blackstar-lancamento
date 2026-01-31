import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`flex flex-col items-center leading-none ${className}`}>
      <span className="font-bold text-xl tracking-wider text-gold">BLACKSTAR</span>
      <span className="text-white text-xs tracking-[0.2em] font-light">LANÇAMENTOS</span>
    </div>
  );
};