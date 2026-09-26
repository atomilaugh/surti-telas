import { useState, useRef, useEffect, type KeyboardEvent as _KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, X, Check } from 'lucide-react';
import { cn } from '@/shared/utils';

export interface ComboboxOption {
  value: string;
  label: string;
}

export interface ComboboxProps {
  label?: string;
  error?: string;
  hint?: string;
  placeholder?: string;
  options: ComboboxOption[];
  value?: string;
  onValueChange?: (value: ComboboxOption) => void;
  onCreateOption?: (value: string) => void;
  allowCreate?: boolean;
  createLabel?: string;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  className?: string;
  id?: string;
}

export const Combobox = ({
  label,
  error,
  hint,
  placeholder = 'Seleccionar o escribir...',
  options,
  value,
  onValueChange,
  onCreateOption,
  allowCreate = true,
  createLabel = 'Crear "{value}"',
  disabled = false,
  loading = false,
  leftIcon,
  className,
  id,
}: ComboboxProps) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  const [inputValue, setInputValue] = useState(value ?? '');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setInputValue(value ?? '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        const target = event.target as Node;
        if (listRef.current && listRef.current.contains(target)) return;
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateDropdownPosition = () => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  };

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(inputValue.trim().toLowerCase())
  );

  const exactMatch = options.some((option) => option.label.toLowerCase() === inputValue.trim().toLowerCase());

  const showCreateOption = allowCreate && inputValue.trim().length > 0 && !exactMatch;

  const handleInputChange = (nextValue: string) => {
    setInputValue(nextValue);
    onValueChange?.({ value: nextValue, label: nextValue });
    setIsOpen(true);
    setHighlightedIndex(-1);
    updateDropdownPosition();
  };

  const handleSelectOption = (option: ComboboxOption) => {
    setInputValue(option.label);
    onValueChange?.(option);
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.blur();
  };

  const handleCreateOption = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    onCreateOption?.(trimmed);
    setInputValue(trimmed);
    onValueChange?.({ value: trimmed, label: trimmed });
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setInputValue('');
    onValueChange?.({ value: '', label: '' });
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  

  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  return (
    <div ref={containerRef} className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={inputId} className="text-[12px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)', zIndex: 2 }}>
            {leftIcon}
          </span>
        )}
        <input
          ref={inputRef}
          id={inputId}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={isOpen ? `${inputId}-listbox` : undefined}
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-activedescendant={
            isOpen && highlightedIndex >= 0 ? `${inputId}-option-${highlightedIndex}` : undefined
          }
          disabled={disabled}
          className={cn(
            'erp-input w-full',
            error && 'border-red-400 focus:ring-red-500/20',
            leftIcon && 'pl-9',
            (inputValue || loading) && 'pr-9',
            className
          )}
          style={{
            background: 'var(--input-bg, var(--color-bg-elevated))',
            borderColor: error ? 'var(--color-error)' : 'var(--input-border, var(--color-border))',
            color: 'var(--input-text, var(--color-text-primary))',
          }}
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onBlur={(event) => {
            const relatedTarget = event.relatedTarget as HTMLElement | null;
            const inList = listRef.current?.contains(relatedTarget as Node);
            const inInput = relatedTarget === inputRef.current;
            if (!inList && !inInput) {
              setIsOpen(false);
              setHighlightedIndex(-1);
            }
          }}
          placeholder={placeholder}
          autoComplete="off"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1" style={{ zIndex: 2 }}>
          {loading && (
            <span className="inline-flex h-4 w-4 items-center justify-center">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" style={{ color: 'var(--color-text-muted)' }} />
            </span>
          )}
          {!loading && inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex h-5 w-5 items-center justify-center rounded-md transition-colors hover:bg-black/5"
              style={{ color: 'var(--color-text-muted)' }}
              tabIndex={-1}
              aria-label="Limpiar"
            >
              <X size={12} />
            </button>
          )}
          <ChevronDown size={14} className="pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
        </div>

        {isOpen &&
          dropdownPosition &&
          createPortal(
            <ul
              ref={listRef}
              id={`${inputId}-listbox`}
              role="listbox"
              className="fixed z-[9999] max-h-52 overflow-auto rounded-xl border shadow-xl"
              style={{
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
                width: `${dropdownPosition.width}px`,
                background: 'var(--color-bg-elevated)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
              onMouseDown={(e) => {
                e.preventDefault();
              }}
            >
              {filteredOptions.length === 0 && !showCreateOption && (
                <li className="px-3 py-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Sin resultados
                </li>
              )}

              {filteredOptions.map((option, index) => {
                const isSelected = option.label.toLowerCase() === inputValue.trim().toLowerCase();
                const isHighlighted = index === highlightedIndex;
                return (
                  <li
                    key={option.value}
                    id={`${inputId}-option-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelectOption(option)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelectOption(option); } }}
                    tabIndex={0}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={cn(
                      'mx-1 my-0.5 flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-[13px] transition-colors',
                      isHighlighted && 'bg-black/5'
                    )}
                    style={{
                      background: isSelected ? 'rgba(0,0,0,0.06)' : undefined,
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected && <Check size={14} style={{ color: 'var(--color-accent)' }} />}
                  </li>
                );
              })}

              {showCreateOption && (
                  <li
                    role="option"
                    onClick={handleCreateOption}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCreateOption(); } }}
                    tabIndex={0}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setHighlightedIndex(filteredOptions.length)}
                    className={cn(
                      'mx-1 my-0.5 flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-[13px] transition-colors',
                      highlightedIndex === filteredOptions.length && 'bg-black/5'
                    )}
                    style={{
                      background: highlightedIndex === filteredOptions.length ? 'rgba(0,0,0,0.05)' : undefined,
                      color: 'var(--color-accent)',
                      borderTop: '1px solid var(--color-border)',
                    }}
                  >
                    <span className="truncate">{createLabel.replace('{value}', inputValue.trim())}</span>
                  </li>
              )}
            </ul>,
            document.body
          )}
      </div>
      {error && <p className="text-[11px]" style={{ color: 'var(--color-error)' }}>{error}</p>}
      {hint && !error && <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{hint}</p>}
    </div>
  );
};

Combobox.displayName = 'Combobox';
