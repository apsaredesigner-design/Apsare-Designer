// Port of server/src/middleware/error.ts + validate.ts's zodDetails: every error
// leaves as `{ error: { message, code, details? } }`; stack traces are only logged.
import { ZodError, type z } from "zod";
import { Prisma } from "../../generated/prisma/client";
import { env } from "../config/env";
import { HttpError, type ErrorDetail } from "../utils/http-error";
import { weakEtag } from "./etag";

export function zodDetails(error: z.ZodError): ErrorDetail[] {
  return error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
}

/**
 * With the pg/neon driver adapters (like the old mariadb one), P2002 has no
 * `meta.target`; the index name sits under meta.driverAdapterError instead:
 * Postgres names it "<Model>_<field>_key" for a unique constraint (e.g.
 * "User_email_key" -> "email") and "<Model>_pkey" for the primary key (MySQL's
 * mariadb adapter instead reported the literal index name "PRIMARY"). Either
 * way, a primary-key clash returns undefined so the column is never leaked.
 */
function uniqueField(err: Prisma.PrismaClientKnownRequestError): string | undefined {
  const meta = err.meta as { target?: string[]; modelName?: string; driverAdapterError?: { cause?: { constraint?: { index?: string } } } };
  if (Array.isArray(meta?.target)) return meta.target.join(",");
  const index = meta?.driverAdapterError?.cause?.constraint?.index;
  if (index === "PRIMARY" || index?.endsWith("_pkey")) return undefined;
  return index?.replace(`${meta.modelName}_`, "").replace(/_key$/, "");
}

export function toHttpError(err: unknown): HttpError {
  if (err instanceof HttpError) return err;
  if (err instanceof ZodError) return new HttpError(400, "Validation failed", "VALIDATION_ERROR", zodDetails(err));
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const field = uniqueField(err);
      if (!field) return new HttpError(409, "Already exists", "CONFLICT");
      return new HttpError(409, "A record with these details already exists", "CONFLICT", [{ path: field, message: "Already exists" }]);
    }
    if (err.code === "P2025") return new HttpError(404, "Record not found");
  }
  // http-errors style errors (status + expose), as body-parser threw them in Express
  const e = err as { status?: number; expose?: boolean; message?: string };
  if (e?.expose && typeof e.status === "number" && e.status < 500) return new HttpError(e.status, e.message ?? "Bad request");

  const message = env.isProd ? "Internal server error" : ((err as Error)?.message ?? "Internal server error");
  return new HttpError(500, message, "INTERNAL");
}

/** The JSON error response (status, body). `headers` carries anything already set (rate-limit, cache, cookies). */
export function errorResponse(err: unknown, headers: Headers = new Headers()): Response {
  const e = toHttpError(err);
  if (e.status === 500) console.error(err);
  const body = JSON.stringify({ error: { message: e.message, code: e.code, details: e.details } });
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("ETag", weakEtag(body)); // Express res.json tagged error bodies too
  return new Response(body, { status: e.status, headers });
}
