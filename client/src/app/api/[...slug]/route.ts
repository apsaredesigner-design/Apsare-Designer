import { methods } from "@/server/http/route";

/**
 * Any /api path no other route.ts matches (Next prefers static and [param]
 * segments over this catch-all): Express's `404 NOT_FOUND` JSON for every method.
 */
export const { GET, POST, PUT, PATCH, DELETE } = methods({});
