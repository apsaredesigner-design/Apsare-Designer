import { z } from "zod";
import { paginationQuery } from "../../utils/pagination";

// Zod schemas for GET /api/admin/audit-log (extracted from server admin.audit.ts).

export const listQuery = paginationQuery
  .extend({
    adminId: z.coerce.number().int().positive().optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, { path: ["to"], message: "`to` must be on or after `from`" });
export type ListQuery = z.infer<typeof listQuery>;
