import { tokenStorage } from './tokenStorage';

/**
 * Cliente HTTP central del frontend.
 * - Base: import.meta.env.VITE_API_URL (p.ej. http://localhost:3000/api/v1)
 * - Inyecta Authorization: Bearer <accessToken>
 * - Desempaqueta el envelope del backend: { success, data, message, error }
 * - Renueva el accessToken automáticamente con /auth/refresh ante un 401 (usa cookie httpOnly)
 */

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ??
    '/api/v1';

export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  auth?: boolean;
  query?: Record<string, string | number | boolean | Array<string | number | boolean> | undefined | null>;
}

/** Callback opcional para que el authStore reaccione cuando la sesión expira. */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const base = API_BASE_URL.replace(/\/$/, '');
  const fullPath = `${base}${path.startsWith('/') ? path : `/${path}`}`;

  if (base.startsWith('http')) {
    const url = new URL(fullPath);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null || value === '') continue;
        if (Array.isArray(value)) {
          for (const item of value) {
            if (item !== undefined && item !== null && item !== '') {
              url.searchParams.append(key, String(item));
            }
          }
          continue;
        }
        url.searchParams.set(key, String(value));
      }
    }
    url.searchParams.set('_t', Date.now().toString());
    return url.toString();
  }

  const params = new URLSearchParams();
  params.set('_t', Date.now().toString());
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue;
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item !== undefined && item !== null && item !== '') {
            params.append(key, String(item));
          }
        }
        continue;
      }
      params.set(key, String(value));
    }
  }
  const separator = params.toString() ? '?' : '';
  return `${fullPath}${separator}${params.toString()}`;
}

/** Renueva el accessToken usando el refreshToken en cookie httpOnly. Devuelve true si tuvo éxito. */
let refreshPromise: Promise<boolean> | null = null;
async function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(buildUrl('/auth/refresh'), {
          method: 'POST',
          headers: { Accept: 'application/json' },
          credentials: 'include',
        });
        const json = (await res.json().catch(() => null)) as ApiEnvelope<{
          accessToken: string;
          refreshToken?: string;
        }> | null;
        if (!res.ok || !json?.success || !json.data?.accessToken) {
          return false;
        }
        tokenStorage.setAccessToken(json.data.accessToken);
        return true;
      } catch {
        return false;
      } finally {
        setTimeout(() => {
          refreshPromise = null;
        }, 0);
      }
    })();
  }
  return refreshPromise;
}

async function doFetch<T>(path: string, options: RequestOptions, retrying = false): Promise<T> {
  const { method = 'GET', body, auth = true, query } = options;

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  if (auth) {
    const token = tokenStorage.getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    const finalUrl = buildUrl(path, query);
    res = await fetch(finalUrl, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'include',
      cache: 'no-store',
    });
  } catch {
    const url = buildUrl(path, query);
    throw new ApiError(
      `No se pudo conectar con el servidor (${url}). Verifica que el backend esté en ejecución y que accedas desde http://localhost:5173`,
      0,
      'network_error',
    );
  }

  // 401 → intenta refrescar una sola vez y reintenta.
  if (res.status === 401 && auth && !retrying) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return doFetch<T>(path, options, true);
    }
    tokenStorage.clear();
    onUnauthorized?.();
  }

  let json: ApiEnvelope<T> | null = null;
  if (res.status !== 204) {
    json = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;
  }

  if (!res.ok || (json && json.success === false)) {
    const message = json?.message || `Error ${res.status}`;
    throw new ApiError(message, res.status, json?.error);
  }

  const payload = json?.data ?? json;
  return (payload as T) ?? (undefined as T);
}

/** Igual que doFetch pero envía un FormData (multipart) sin sobrescribir el Content-Type. */
async function doFetchForm<T>(path: string, options: RequestOptions, retrying = false): Promise<T> {
  const { method = 'POST', body, auth = true, query } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };

  if (auth) {
    const token = tokenStorage.getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body as FormData,
      credentials: 'include',
    });
  } catch {
    throw new ApiError(
      'No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.',
      0,
      'network_error',
    );
  }

  if (res.status === 401 && auth && !retrying) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return doFetchForm<T>(path, options, true);
    }
    tokenStorage.clear();
    onUnauthorized?.();
  }

  let json: ApiEnvelope<T> | null = null;
  if (res.status !== 204) {
    json = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;
  }

  if (!res.ok || (json && json.success === false)) {
    const message = json?.message || `Error ${res.status}`;
    throw new ApiError(message, res.status, json?.error);
  }

  const payload = json?.data ?? json;
  return (payload as T) ?? (undefined as T);
}

export const api = {
  get: <T>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    doFetch<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    doFetch<T>(path, { ...opts, method: 'POST', body }),
  postForm: <T>(path: string, form: FormData, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    doFetchForm<T>(path, { ...opts, method: 'POST', body: form }),
  patch: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    doFetch<T>(path, { ...opts, method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    doFetch<T>(path, { ...opts, method: 'PUT', body }),
  delete: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    doFetch<T>(path, { ...opts, method: 'DELETE', body }),
  /**
   * Obtiene un recurso binario (imagen, PDF) como Blob.
   * Envía el header de autenticación Bearer automáticamente.
   */
  getBlob: async (path: string, opts?: Omit<RequestOptions, 'method' | 'body'>): Promise<Blob> => {
    const { auth = true, query } = opts ?? {};
    const headers: Record<string, string> = {
      Accept: '*/*',
    };
    if (auth) {
      const token = tokenStorage.getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    const finalUrl = buildUrl(path, query);
    const res = await fetch(finalUrl, {
      method: 'GET',
      headers,
      credentials: 'include',
      cache: 'no-store',
    });

    if (res.status === 401 && auth) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        const newToken = tokenStorage.getAccessToken();
        if (newToken) headers.Authorization = `Bearer ${newToken}`;
        const retryRes = await fetch(finalUrl, {
          method: 'GET',
          headers,
          credentials: 'include',
          cache: 'no-store',
        });
        if (!retryRes.ok) {
          throw new ApiError(`Error ${retryRes.status} al obtener recurso`, retryRes.status);
        }
        return retryRes.blob();
      }
      tokenStorage.clear();
      onUnauthorized?.();
    }

    if (!res.ok) {
      throw new ApiError(`Error ${res.status} al obtener recurso`, res.status);
    }
    return res.blob();
  },
};
