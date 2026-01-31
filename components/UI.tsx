import React from 'react';

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }> = ({
  children, className = '', variant = 'primary', ...props
}) => {
  const baseStyle = "px-6 py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-gold hover:bg-gold-hover text-white shadow-lg shadow-gold/20",
    secondary: "bg-surface border border-gray-700 hover:border-gold text-white hover:text-gold",
    danger: "bg-red-900/50 text-red-200 hover:bg-red-900 border border-red-800",
    ghost: "bg-transparent hover:bg-white/5 text-gray-400 hover:text-white"
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, className = '', ...props }) => (
  <div className="flex flex-col gap-1 w-full">
    <label className="text-sm text-gray-400 font-medium ml-1">{label}</label>
    <input
      className={`bg-input border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors placeholder-gray-600 ${className}`}
      {...props}
    />
  </div>
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

export const Card: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-surface rounded-xl border border-gray-800 p-6 ${className}`}>
    {children}
  </div>
);

export const Badge: React.FC<{ status: string }> = ({ status }) => {
  const getColors = (s: string) => {
    switch (s) {
      case 'Finalizado': return 'bg-gold text-white';
      case 'Distribuído': return 'bg-green-900 text-green-100 border border-green-700';
      case 'Aprovado': return 'bg-blue-900 text-blue-100 border border-blue-700';
      case 'Em Análise': return 'bg-yellow-900 text-yellow-100 border border-yellow-700';
      case 'Rejeitado': return 'bg-red-900 text-red-100 border border-red-700';
      default: return 'bg-gray-800 text-gray-400';
    }
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${getColors(status)}`}>
      {status}
    </span>
  );
};