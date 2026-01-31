// Smart Title Case Logic
export const smartTitleCase = (str: string): string => {
  if (!str) return '';
  
  const smallWords = /^(a|an|and|as|at|but|by|en|for|if|in|nor|of|on|or|per|the|to|vs?\.?|via|o|a|os|as|um|uns|uma|umas|de|do|da|dos|das|em|na|no|nas|nos|por|para|e|ou)$/i;
  const alphanumericPattern = /([A-Za-z0-9\u00C0-\u00FF])/;

  return str.split(' ').map((word, index, allWords) => {
    if (index > 0 && index < allWords.length - 1 && smallWords.test(word)) {
      return word.toLowerCase();
    }
    // Uppercase first letter of word
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
};

// Date Validation (Min 10 days)
export const getMinReleaseDate = (): string => {
  const date = new Date();
  date.setDate(date.getDate() + 10);
  return date.toISOString().split('T')[0];
};

// Generate Mock Hash (SHA-256 simulation)
export const generateMockHash = (fileName: string): string => {
  const timestamp = Date.now().toString();
  // Simple simulation of a hash string
  let hash = 0;
  const str = fileName + timestamp;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'sha256-' + Math.abs(hash).toString(16).padStart(64, '0').substring(0, 16) + '...';
};

// Image Dimension Validator
export const validateImageDimensions = (file: File): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      // Strict 3000x3000px as per requirements
      if (img.width === 3000 && img.height === 3000) {
        resolve(true);
      } else {
        resolve(false);
      }
    };
    img.onerror = () => resolve(false);
  });
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR');
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'Finalizado': return 'text-gold border-gold bg-gold/10';
    case 'Distribuído': return 'text-green-400 border-green-400 bg-green-400/10';
    case 'Aprovado': return 'text-blue-400 border-blue-400 bg-blue-400/10';
    case 'Em Análise': return 'text-yellow-400 border-yellow-400 bg-yellow-400/10';
    default: return 'text-gray-400 border-gray-400 bg-gray-400/10';
  }
};