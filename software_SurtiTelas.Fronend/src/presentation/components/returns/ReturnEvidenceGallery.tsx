import React, { useEffect, useState } from 'react';
import { FileText, ImageOff, Loader2, Maximize2 } from 'lucide-react';
import s from './ReturnEvidenceGallery.module.css';
import { returnsApi } from '@/infrastructure/api/returnsApi';

interface EvidenceItem {
  index: number;
  url: string | null;
  nombre: string;
  mime: string | null;
  loading: boolean;
  error: boolean;
}

interface ReturnEvidenceGalleryProps {
  returnRequestId: string;
  evidencias?: string[] | null;
  numeroDevolucion?: string;
}

const guessNombre = (reference: string, index: number): string => {
  const base = reference.split('/').pop() ?? `evidencia-${index + 1}`;
  return base.length > 0 ? base : `evidencia-${index + 1}`;
};

/**
 * Galería de evidencias de una devolución.
 * Las imágenes se descargan con sesión (endpoint autenticado) y se muestran como
 * objeto URL temporal; nunca se expone una URL pública del almacenamiento.
 */
export const ReturnEvidenceGallery: React.FC<ReturnEvidenceGalleryProps> = ({
  returnRequestId,
  evidencias,
  numeroDevolucion,
}) => {
  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [zoomed, setZoomed] = useState<EvidenceItem | null>(null);

  const references = evidencias ?? [];
  const referencesKey = references.join('|');

  useEffect(() => {
    let cancelled = false;
    const objectUrls: string[] = [];
    const items = referencesKey ? referencesKey.split('|') : [];

    if (!returnRequestId || items.length === 0) {
      setItems([]);
      return () => {
        cancelled = true;
      };
    }

    setItems(
      items.map((reference, index) => ({
        index,
        url: null,
        nombre: guessNombre(reference, index),
        mime: null,
        loading: true,
        error: false,
      })),
    );

    items.forEach((_reference, index) => {
      returnsApi
        .getEvidenceBlob(returnRequestId, index)
        .then((blob) => {
          if (cancelled) return;
          const objectUrl = URL.createObjectURL(blob);
          objectUrls.push(objectUrl);
          setItems((prev) =>
            prev.map((item) =>
              item.index === index
                ? { ...item, url: objectUrl, mime: blob.type || null, loading: false, error: false }
                : item,
            ),
          );
        })
        .catch(() => {
          if (cancelled) return;
          setItems((prev) =>
            prev.map((item) => (item.index === index ? { ...item, loading: false, error: true } : item)),
          );
        });
    });

    return () => {
      cancelled = true;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [returnRequestId, referencesKey]);

  if (references.length === 0) {
    return <p className={s.empty}>Sin evidencias adjuntas</p>;
  }

  const alt = (index: number) => `Evidencia ${index + 1} de la devolución ${numeroDevolucion ?? ''}`.trim();

  return (
    <>
      <div className={s.grid}>
        {items.map((item) => {
          if (item.loading) {
            return (
              <div key={item.index} className={s.tile}>
                <Loader2 size={20} className={s.spinner} />
                <span className={s.caption}>Cargando…</span>
              </div>
            );
          }

          if (item.error || !item.url) {
            return (
              <div key={item.index} className={`${s.tile} ${s.tileError}`}>
                <ImageOff size={20} />
                <span className={s.caption}>No se pudo cargar la evidencia</span>
              </div>
            );
          }

          const isImage = (item.mime ?? '').startsWith('image/');

          if (isImage) {
            return (
              <figure key={item.index} className={s.tile}>
                <img
                  src={item.url}
                  alt={alt(item.index)}
                  loading="lazy"
                  onError={(event) => {
                    (event.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
                <button
                  type="button"
                  className={s.zoomButton}
                  onClick={() => setZoomed(item)}
                  aria-label={`Ampliar ${alt(item.index)}`}
                >
                  <Maximize2 size={14} />
                </button>
                <figcaption className={s.caption}>{alt(item.index)}</figcaption>
              </figure>
            );
          }

          return (
            <div key={item.index} className={`${s.tile} ${s.fileTile}`}>
              <FileText size={20} />
              <span className={s.caption}>📎 {item.nombre}</span>
              <a className={s.fileLink} href={item.url} target="_blank" rel="noreferrer">
                Ver archivo
              </a>
            </div>
          );
        })}
      </div>

      {zoomed?.url && (
        <div
          className={s.lightbox}
          role="dialog"
          aria-modal="true"
          aria-label={alt(zoomed.index)}
          onClick={() => setZoomed(null)}
        >
          <img src={zoomed.url} alt={alt(zoomed.index)} />
          <button type="button" className={s.closeButton} onClick={() => setZoomed(null)} aria-label="Cerrar">
            ×
          </button>
        </div>
      )}
    </>
  );
};

export default ReturnEvidenceGallery;
