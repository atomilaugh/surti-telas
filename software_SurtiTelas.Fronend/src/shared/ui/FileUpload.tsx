import React, { useCallback, useRef, useState, useMemo } from 'react';
import { Upload, X, File, Image, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/shared/utils';

export interface FileUploadProps {
  accept?: string;
  maxSizeMB?: number;
  maxFiles?: number;
  value?: File | File[] | null;
  onChange: (files: File[] | null) => void;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  hint?: string;
  label?: string;
  allowPreview?: boolean;
  previewWidth?: number;
  previewHeight?: number;
  className?: string;
}

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.pdf', '.doc', '.docx', '.txt'];
const MAX_SIZE_MB = 10;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(file: File): React.ReactNode {
  if (file.type.startsWith('image/')) return <Image size={20} />;
  if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) return <FileText size={20} />;
  return <File size={20} />;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  accept,
  maxSizeMB = MAX_SIZE_MB,
  maxFiles = 1,
  value,
  onChange,
  disabled = false,
  loading = false,
  error,
  hint,
  label,
  allowPreview = true,
  previewWidth = 120,
  previewHeight = 80,
  className,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const files = useMemo(() => (Array.isArray(value) ? value : value ? [value] : []), [value]);

  const validateFile = useCallback(
    (file: File): string | null => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (accept) {
        const allowedExts = accept.split(',').map((a) => a.trim().toLowerCase());
        if (!allowedExts.includes(ext) && !allowedExts.includes(file.type)) {
          return `Formato no permitido. Formatos aceptados: ${accept}`;
        }
      } else if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return `Formato no permitido. Formatos aceptados: ${ALLOWED_EXTENSIONS.join(', ')}`;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        return `El archivo excede el tama\u00f1o m\u00e1ximo de ${maxSizeMB} MB`;
      }
      return null;
    },
    [accept, maxSizeMB],
  );

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const validFiles: File[] = [];
      const errors: string[] = [];

      const filesToProcess = maxFiles === 1 ? [fileList[0]] : Array.from(fileList);
      for (const file of filesToProcess) {
        const err = validateFile(file);
        if (err) {
          errors.push(err);
        } else {
          validFiles.push(file);
        }
      }

      if (errors.length > 0) {
        onChange(validFiles.length > 0 ? validFiles : null);
      } else {
        onChange(validFiles);
      }
    },
    [maxFiles, validateFile, onChange],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;
      handleFiles(e.dataTransfer.files);
    },
    [disabled, handleFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  }, [disabled]);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
      e.target.value = '';
    },
    [handleFiles],
  );

  const removeFile = useCallback(
    (index: number) => {
      if (maxFiles === 1) {
        onChange(null);
      } else {
        const current = Array.isArray(value) ? [...value] : value ? [value] : [];
        current.splice(index, 1);
        onChange(current);
      }
    },
    [maxFiles, value, onChange],
  );

  const openFileDialog = useCallback(() => {
    inputRef.current?.click();
  }, []);

  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  React.useEffect(() => {
    if (allowPreview && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    } else {
      setPreviewUrl(null);
    }
  }, [files, allowPreview]);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && (
        <label className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          {label}
        </label>
      )}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={openFileDialog}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFileDialog(); } }}
        tabIndex={0}
        role="button"
        aria-label="Seleccionar archivo"
        className={cn(
          'relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-all duration-200 cursor-pointer select-none',
          isDragOver
            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
            : 'border-[var(--color-border)] bg-[var(--color-bg-elevated)] hover:border-[var(--color-border-hover)]',
          disabled && 'opacity-50 cursor-not-allowed',
          error && 'border-red-400 bg-red-500/5',
        )}
        style={{ minHeight: '120px' }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={maxFiles > 1}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />
        {loading ? (
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
        ) : (
          <Upload size={24} style={{ color: 'var(--color-text-muted)' }} />
        )}
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {isDragOver ? 'Suelta el archivo aqu\u00ed' : 'Arrastra un archivo o haz clic para seleccionar'}
          </p>
          {hint && <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{hint}</p>}
        </div>
        {!loading && (
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {accept ? `Formatos: ${accept} | ` : ''}M\u00e1ximo: {maxSizeMB} MB
          </p>
        )}
      </div>
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-400">
          <AlertCircle size={12} />
          {error}
        </div>
      )}
      {files.length > 0 && (
        <div className="flex flex-col gap-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-3"
            >
              {previewUrl && allowPreview ? (
                <img
                  src={previewUrl}
                  alt={file.name}
                  className="rounded-lg object-cover"
                  style={{ width: previewWidth, height: previewHeight }}
                />
              ) : (
                <div
                  className="flex items-center justify-center rounded-lg"
                  style={{ width: previewWidth, height: previewHeight, background: 'var(--color-bg-surface)' }}
                >
                  {getFileIcon(file)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                  {file.name}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {formatFileSize(file.size)}
                </p>
              </div>
              {loading && <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />}
              {!loading && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  className="shrink-0 p-1 rounded-lg hover:bg-red-500/10 transition-colors"
                  style={{ color: 'var(--color-text-muted)' }}
                  aria-label={`Eliminar archivo ${file.name}`}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};