import { z } from "zod";
import { paginationQuery } from "../../utils/pagination";
import { queryBool } from "./admin.shared";

// Zod schemas for /api/admin/contact-messages (extracted from server admin.contact.ts).

export const listQuery = paginationQuery.extend({ isRead: queryBool.optional() });
export const updateSchema = z.object({ isRead: z.boolean() });

export type ListQuery = z.infer<typeof listQuery>;
export type UpdateInput = z.infer<typeof updateSchema>;
