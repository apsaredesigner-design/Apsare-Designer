import { adminMethods } from "@/server/modules/admin/admin.route";

/**
 * Any /api/admin path no other route.ts matches (including /api/admin itself): the admin
 * router's middleware, then Express's 404 (guest 401, customer 403, admin 404, audited).
 */
export const { GET, POST, PUT, PATCH, DELETE } = adminMethods({});
