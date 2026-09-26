import fs from 'fs';
import path from 'path';
import { randomUUID } from 'node:crypto';
import multer from 'multer';

/* eslint-disable @typescript-eslint/no-explicit-any */

export const RETURN_EVIDENCE_DIR = 'return-evidence';
export const RETURN_EVIDENCE_URL_PREFIX = `/uploads/${RETURN_EVIDENCE_DIR}`;

const uploadsDir = path.resolve(process.cwd(), 'uploads', RETURN_EVIDENCE_DIR);

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
];

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'application/pdf': '.pdf',
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(uploadsDir, { recursive: true });
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = EXTENSION_BY_MIME[file.mimetype] ?? path.extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${ext}`);
  },
});

export const returnEvidenceUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Tipo de archivo no permitido. Usa JPG, PNG, WEBP, GIF o PDF'));
  },
});

export const MAX_RETURN_EVIDENCES = 10;

/** Traduce un archivo subido a la referencia persistente que se guarda en la base de datos. */
export function toReturnEvidenceRef(file: Express.Multer.File): string {
  return `${RETURN_EVIDENCE_URL_PREFIX}/${file.filename}`;
}

/** Traduce la referencia persistida a la ruta física en disco, validando que no escape del directorio. */
export function resolveReturnEvidencePath(reference: string): string | null {
  const uploadsRoot = path.resolve(process.cwd(), 'uploads');
  const relative = reference.startsWith('/uploads/') ? reference.slice('/uploads/'.length) : null;
  if (!relative || relative.includes('..')) return null;

  const fullPath = path.resolve(uploadsRoot, relative);
  if (fullPath !== uploadsRoot && !fullPath.startsWith(uploadsRoot + path.sep)) return null;
  if (!fs.existsSync(fullPath)) return null;
  return fullPath;
}
