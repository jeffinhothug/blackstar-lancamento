import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <img 
      src="/logo.png" 
      alt="Black Star Produtora" 
      className={`object-contain ${className}`}
    />
  );
};