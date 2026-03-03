import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`flex flex-col items-center leading-none group transition-all duration-500 ${className}`}>
      <span className="font-semibold text-3xl tracking-[0.15em] text-white group-hover:text-gold transition-colors duration-500 drop-shadow-[0_0_10px_rgba(255,255,255,0.1)] group-hover:drop-shadow-[0_0_20px_rgba(212,175,55,0.4)]">
        BLACK<span className="text-gold">STAR</span>
      </span>
      <span className="text-zinc-500 text-[9px] tracking-[0.6em] font-medium uppercase mt-1 group-hover:text-gold/50 transition-colors">
        Lançamentos
      </span>
    </div>
  );
};