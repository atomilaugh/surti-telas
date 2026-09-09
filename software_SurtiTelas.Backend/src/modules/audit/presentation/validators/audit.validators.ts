import { z } from 'zod';

export const AuditLogFiltersSchema = z.object({
  actorUserId: z.string().optional(),
  targetUserId: z.string().optional(),
  module: z.string().optional(),
  action: z.string().optional(),
  result: z.enum(['SUCCESS', 'FAILURE', 'DENIED']).optional(),
  entityType: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  cursor: z.string().optional(),
  sort: z.enum(['createdAt']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});
