import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`font-bold text-xl tracking-wider text-gold ${className}`}>
      BLACKSTAR <span className="text-white">LANÇAMENTOS</span>
    </div>
  );
};