import React, { useRef, KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import s from '@/presentation/pages/admin/AdminCatalogo.module.css';
import { resolveColor, type ResolvedColor } from '@/shared/utils/colorUtils';

interface AddTagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder: string;
  colorMode?: boolean;
}

export const AddTagInput: React.FC<AddTagInputProps> = ({ tags, onTagsChange, placeholder, colorMode = false }) => {
  const [inputValue, setInputValue] = React.useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const resolveInputColor = (): ResolvedColor | null => {
    if (!colorMode) return null;
    return resolveColor(inputValue);
  };

  const addTag = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onTagsChange([...tags, trimmed]);
    }
    setInputValue('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      onTagsChange(tags.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(t => t !== tagToRemove));
  };

  const preview = resolveInputColor();

  return (
    <div
      className={s.tagInputWrapper}
      onClick={() => inputRef.current?.focus()}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.focus(); } }}
      tabIndex={0}
      role="button"
      aria-label="Agregar etiqueta"
    >
      {tags.map(tag => {
        const resolved = colorMode ? resolveColor(tag) : null;
        return (
          <span key={tag} className={s.tagChip}>
            <span className={s.tagColorDot} style={resolved ? { backgroundColor: resolved.value } : undefined} />
            {resolved ? resolved.label : tag}
            <button type="button" className={s.tagRemoveBtn} onClick={() => removeTag(tag)}>
              <X size={10} />
            </button>
          </span>
        );
      })}
      <input
        ref={inputRef}
        type="text"
        className={s.tagTextInput}
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (inputValue.trim()) addTag(); }}
        placeholder={tags.length === 0 ? placeholder : 'Escribe y presiona Enter...'}
      />
      {colorMode && preview && (
        <span className={s.tagColorPreview} style={{ backgroundColor: preview.value }} title={preview.label} />
      )}
    </div>
  );
};
