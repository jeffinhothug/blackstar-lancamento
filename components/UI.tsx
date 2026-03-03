import React from 'react';

export type ClassValue = string | boolean | null | undefined;
export function cn(...inputs: ClassValue[]): string {
  return inputs.filter(Boolean).join(' ');
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, ...props }, ref) => {
    const baseStyle = "px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2";
    const sizeStyles = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-6 py-3 text-base',
      lg: 'px-8 py-4 text-lg',
    };
    const variants = {
      primary: 'bg-gold text-black hover:bg-gold/90 shadow-[0_0_15px_rgba(212,175,55,0.3)] active:scale-95 transition-all duration-200',
      secondary: 'bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700 active:scale-95 transition-all duration-200',
      outline: 'bg-transparent border-2 border-gold text-gold hover:bg-gold hover:text-black active:scale-95 transition-all duration-200',
      ghost: 'bg-transparent text-white hover:bg-white/10 active:scale-95 transition-all duration-200',
      danger: 'bg-red-600 text-white hover:bg-red-700 active:scale-95 transition-all duration-200',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyle, variants[variant], sizeStyles[size], className)}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {props.children}
      </button>
    );
  }
);

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && <label className="text-sm font-medium text-zinc-400 ml-1 tracking-wider">{label}</label>}
        <input
          ref={ref}
          className={cn(
            'w-full bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-lg px-4 py-2.5 text-white',
            'focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all duration-300',
            'placeholder:text-zinc-600',
            error && 'border-red-500 focus:ring-red-500/50',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-500 mt-1 ml-1">{error}</p>}
      </div>
    );
  }
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string, options: { value: string, label: string }[] }> = ({ label, options, className = '', ...props }) => (
  <div className="flex flex-col gap-1 w-full">
    <label className="text-sm text-gray-400 font-medium ml-1">{label}</label>
    <select
      className={`bg-input border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors appearance-none ${className}`}
      {...props}
    >
      <option value="" disabled>Selecione...</option>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

export const FileUpload: React.FC<{
  label: string;
  accept: string;
  onChange: (file: File | null) => void;
  infoText?: string;
  required?: boolean;
}> = ({ label, accept, onChange, infoText, required }) => {
  const [fileName, setFileName] = React.useState<string | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFileName(file ? file.name : null);
    onChange(file);
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      <label className="text-sm text-gray-400 font-medium ml-1">{label} {required && <span className="text-gold">*</span>}</label>
      <div className="relative group">
        <input
          type="file"
          accept={accept}
          onChange={handleFile}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div className={`bg-input border border-dashed ${fileName ? 'border-gold text-gold' : 'border-gray-700 text-gray-500'} group-hover:border-gray-500 rounded-lg px-4 py-3 flex justify-between items-center transition-colors`}>
          <span className="truncate max-w-[80%]">{fileName || "Clique para fazer upload"}</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
      </div>
      {infoText && <p className="text-xs text-gray-500 ml-1">{infoText}</p>}
    </div>
  );
};

export const Card: React.FC<{ children: React.ReactNode, onClick?: () => void, className?: string }> = ({ children, onClick, className = '' }) => (
  <div
    onClick={onClick}
    className={cn(
      "bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/50 rounded-[2rem] p-8 transition-all duration-500",
      onClick && "cursor-pointer hover:bg-zinc-800/60 hover:border-gold/30 hover:-translate-y-1 shadow-2xl",
      className
    )}
  >
    {children}
  </div>
);

export const Badge: React.FC<{ status: string }> = ({ status }) => {
  const getColors = (s: string) => {
    switch (s) {
      case 'Finalizado': return 'bg-gold/10 text-gold border-gold/20 shadow-[0_0_15px_rgba(212,175,55,0.1)]';
      case 'Distribuído': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'Aprovado': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Em Análise': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'Rejeitado': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-zinc-900 text-zinc-500 border-zinc-800';
    }
  };

  return (
    <span className={cn(
      "px-3 py-1 rounded-full text-[9px] font-semibold uppercase tracking-[0.2em] border transition-all duration-300",
      getColors(status)
    )}>
      {status}
    </span>
  );
};