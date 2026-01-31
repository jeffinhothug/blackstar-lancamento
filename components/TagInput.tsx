import React, { useState, KeyboardEvent } from 'react';
import { smartTitleCase } from '../utils';

interface TagInputProps {
    label: string;
    tags: string[];
    onChange: (tags: string[]) => void;
    placeholder?: string;
    required?: boolean;
    suggestions?: string[];
    maxTags?: number;
}

export const TagInput: React.FC<TagInputProps> = ({
    label,
    tags,
    onChange,
    placeholder = "Digite e aperte Enter...",
    required,
    suggestions = [],
    maxTags
}) => {
    const [input, setInput] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Filter suggestions based on substring match (fuzzy-like)
    const filteredSuggestions = input.trim()
        ? suggestions.filter(s => s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s))
        : [];

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(input);
        } else if (e.key === 'Backspace' && !input && tags.length > 0) {
            removeTag(tags.length - 1);
        }
    };

    const addTag = (val: string) => {
        const trimmed = val.trim();
        // Check Limit
        if (maxTags && tags.length >= maxTags) {
            alert(`Limite máximo de ${maxTags} itens atingido.`);
            setInput('');
            setShowSuggestions(false);
            return;
        }

        if (trimmed && !tags.includes(trimmed)) {
            const formatted = smartTitleCase(trimmed);
            onChange([...tags, formatted]);
            setInput('');
            setShowSuggestions(false);
        } else if (trimmed && tags.includes(trimmed)) {
            setInput('');
            setShowSuggestions(false);
        }
    };

    const removeTag = (index: number) => {
        onChange(tags.filter((_, i) => i !== index));
    };

    return (
        <div className="flex flex-col gap-1 w-full relative">
            <label className="text-sm text-gray-400 font-medium ml-1">
                {label} {required && <span className="text-gold">*</span>}
                {maxTags && <span className="text-xs text-gray-600 ml-2">(Máx: {maxTags})</span>}
            </label>
            <div className="bg-input border border-gray-800 rounded-lg p-2 min-h-[50px] flex flex-wrap gap-2 focus-within:border-gold focus-within:ring-1 focus-within:ring-gold transition-colors relative z-10">
                {tags.map((tag, index) => (
                    <span key={index} className="bg-gold/20 text-gold border border-gold/30 px-2 py-1 rounded text-sm flex items-center gap-1">
                        {tag}
                        <button
                            type="button"
                            onClick={() => removeTag(index)}
                            className="hover:text-white transition-colors"
                        >
                            &times;
                        </button>
                    </span>
                ))}
                <input
                    type="text"
                    className="bg-transparent outline-none flex-1 min-w-[120px] text-white placeholder-gray-600 px-2 py-1"
                    placeholder={tags.length === 0 ? placeholder : (maxTags && tags.length >= maxTags ? "Limite atingido" : "")}
                    value={input}
                    onChange={(e) => {
                        setInput(e.target.value);
                        setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} // Delay to allow click
                    onKeyDown={handleKeyDown}
                    disabled={!!maxTags && tags.length >= maxTags}
                />
            </div>
            <p className="text-xs text-gray-500 ml-1">Separe os nomes por Enter ou vírgula.</p>

            {/* Custom Suggestions Dropdown */}
            {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto z-50">
                    <div className="p-2 text-xs text-gray-500 uppercase font-bold border-b border-gray-800 bg-black/20">
                        Sugestões Encontradas
                    </div>
                    {filteredSuggestions.map((suggestion, idx) => (
                        <div
                            key={idx}
                            onClick={() => addTag(suggestion)}
                            className="px-4 py-2 hover:bg-gold/20 hover:text-white cursor-pointer text-gray-300 transition-colors"
                        >
                            {suggestion}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
