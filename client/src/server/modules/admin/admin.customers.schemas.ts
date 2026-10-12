import { z } from "zod";
import { Role } from "../../../generated/prisma/client";
import { paginationQuery } from "../../utils/pagination";
import { queryBool, searchTerm } from "./admin.shared";

// Zod schemas for /api/admin/customers (extracted from server admin.customers.ts).

export const listQuery = paginationQuery.extend({
  q: searchTerm, // name, email or mobile contains
  isActive: queryBool.optional(),
  role: z.enum(Role).default("CUSTOMER"),
  sort: z.enum(["createdAt_desc", "createdAt_asc", "fullName_asc", "fullName_desc", "orders_desc"]).default("createdAt_desc"),
});
export const statusSchema = z.object({ isActive: z.boolean() });
export const roleSchema = z.object({ role: z.enum(Role) });

export type ListQuery = z.infer<typeof listQuery>;
export type StatusInput = z.infer<typeof statusSchema>;
export type RoleInput = z.infer<typeof roleSchema>;
