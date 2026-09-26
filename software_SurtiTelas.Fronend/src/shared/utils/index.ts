export type { ImageWithFallbackProps } from './image-utils'
export { sanitizeImageUrl, DEFAULT_IMAGES, useImage, getImageFallbackProps, isUnsafeExternalUrl } from './image-utils'
export { ImageWithFallback } from '@presentation/components/common/ImageWithFallback'

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (value: number, currency = 'COP') =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency, minimumFractionDigits: 0 }).format(value);

export const formatDate = (date: string | Date) =>
  new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date));

export const formatDatetime = (date: string | Date) =>
  new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(date));

export const truncate = (str: string, max = 40) =>
  str.length > max ? str.slice(0, max) + '...' : str;

export const debounce = <T extends (...args: unknown[]) => void>(fn: T, delay = 300) => {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

export const slugify = (str: string) =>
  str.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');

export { isValidNit, normalizeNit, formatNitDisplay, isValidDocumentNumber, normalizeDocumentNumber } from './document';
export { toNumber, toInteger, roundTo, toPercent, clamp, isPositiveNumber, isNonNegativeNumber, isInteger, parseCurrency } from './number';
export { timeAgo } from './relativeTime';
export {
  createColorRow,
  buildColorStockIndex,
  colorRowsFromProducto,
  colorsFromRows,
  rowsToVariantes,
  totalStockFromRows,
  validateColorRows,
} from './colorStock';
export type { ColorStockIndex, ColorStockRow } from './colorStock';


