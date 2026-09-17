export interface PaginationLinks {
  self: string;
  first: string;
  last: string;
  next?: string;
  prev?: string;
}

export interface ResourceLink {
  self: string;
}

export interface PaginationMeta {
  totalRecords: number;
  page: number;
  limit: number;
  totalPages: number;
  links: PaginationLinks;
  nextCursor?: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PaginatedApiResponse<T> {
  items: T[];
  totalRecords: number;
  page: number;
  limit: number;
  totalPages: number;
  nextCursor: string | null;
  activos?: number;
  inactivos?: number;
  conDeuda?: number;
}

export function buildHateoasLinks(basePath: string, id?: string): ResourceLink {
  return {
    self: id ? `${basePath}/${id}` : basePath,
  };
}

export function buildPaginationMeta(
  totalRecords: number,
  page: number,
  limit: number,
  baseUrl: string,
  queryParams: Record<string, string | undefined> = {},
  nextCursor?: string
): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(totalRecords / limit));
  const safePage = Math.min(page, totalPages);

  const buildUrl = (targetPage: number, cursor?: string) => {
    const params = new URLSearchParams();
    if (cursor) {
      params.set('cursor', cursor);
    } else {
      params.set('page', String(targetPage));
    }
    params.set('limit', String(limit));
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params.set(key, value);
    });
    return `${baseUrl}?${params.toString()}`;
  };

  const links: PaginationLinks = {
    self: buildUrl(safePage),
    first: buildUrl(1),
    last: buildUrl(totalPages),
  };

  if (nextCursor) {
    links.next = buildUrl(1, nextCursor);
  } else if (safePage < totalPages) {
    links.next = buildUrl(safePage + 1);
  }

  if (safePage > 1) {
    links.prev = buildUrl(safePage - 1);
  }

  return {
    totalRecords,
    page: safePage,
    limit,
    totalPages,
    links,
    nextCursor: nextCursor ?? null,
  };
}

export function buildApiPaginatedResponse<T>(
  items: T[],
  totalRecords: number,
  page: number,
  limit: number,
  nextCursor?: string | null,
  counts?: { activos?: number; inactivos?: number; conDeuda?: number }
): PaginatedApiResponse<T> {
  const totalPages = Math.max(1, Math.ceil(totalRecords / limit));
  const safePage = Math.min(page, totalPages);

  return {
    items,
    totalRecords,
    page: safePage,
    limit,
    totalPages,
    nextCursor: nextCursor ?? null,
    ...counts,
  };
}
