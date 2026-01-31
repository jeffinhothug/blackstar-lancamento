import React from 'react';
import logoSrc from '../assets/logo.png';

export const Logo: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <img
      src={logoSrc}
      alt="Black Star Produtora"
      className={`object-contain ${className}`}
    />
  );
};