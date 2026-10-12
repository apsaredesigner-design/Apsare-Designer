"use client";
/**
 * useMutation: run a write (POST/PATCH/DELETE) with pending state and toast feedback.
 *
 *   const save = useMutation((body: AdminCouponInput) => adminApi.coupons.create(body), {
 *     success: "Coupon created",
 *     onSuccess: (coupon) => router.push(`/admin/coupons/${coupon.id}`),
 *   });
 *   <form onSubmit={(e) => { e.preventDefault(); save.mutate(values); }}>
 *   <FormField errors={save.fieldErrors} name="code" …>
 *   <Button loading={save.pending}>Save</Button>
 *
 * `mutate` resolves to the result, or `undefined` on failure (it never throws).
 * On error it toasts `errorMessage(err)` unless `error: false`; validation errors
 * are exposed as `fieldErrors` (keyed by path, e.g. "code", "variants.0.sku").
 *
 * Optimistic updates: `onMutate(...args)` runs before the request; roll back in
 * `onError(err, ...args)`. Every callback receives the `mutate` arguments after the
 * result/error, and `onSettled(...args)` runs last either way.
 *
 *   const toggle = useMutation((p: Item, on: boolean) => adminApi.products.setStatus(p.id, on), {
 *     onMutate: (p, on) => patch(p.id, on),
 *     onError: (_err, p, on) => patch(p.id, !on),
 *   });
 */
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { ApiError } from "@/lib/api";
import { useToast } from "@/components/admin/Toast";
import { errorMessage, toApiError } from "./errors";

export interface MutationOptions<TResult, TArgs extends unknown[] = unknown[]> {
  /** Toast on success: a title, or a function of the result. Omit for no toast. */
  success?: string | ((result: TResult, ...args: TArgs) => string);
  /** Toast title on error (default: a friendly message for the status), or false for none. */
  error?: string | false | ((err: ApiError, ...args: TArgs) => string);
  /** Runs before the request, e.g. to apply an optimistic update. */
  onMutate?: (...args: TArgs) => void;
  onSuccess?: (result: TResult, ...args: TArgs) => void;
  /** Runs after a failure, e.g. to roll back an optimistic update. */
  onError?: (err: ApiError, ...args: TArgs) => void;
  /** Runs last, after success or failure. */
  onSettled?: (...args: TArgs) => void;
}

export function useMutation<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: MutationOptions<TResult, TArgs> = {},
) {
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const fnRef = useRef(fn);
  const optsRef = useRef(options);
  // Always call the latest closures without re-creating `mutate`.
  useLayoutEffect(() => {
    fnRef.current = fn;
    optsRef.current = options;
  });

  const mutate = useCallback(
    async (...args: TArgs): Promise<TResult | undefined> => {
      const opts = optsRef.current;
      setPending(true);
      setError(null);
      opts.onMutate?.(...args);
      try {
        const result = await fnRef.current(...args);
        if (opts.success) toast.success(typeof opts.success === "function" ? opts.success(result, ...args) : opts.success);
        opts.onSuccess?.(result, ...args);
        return result;
      } catch (e) {
        const err = toApiError(e);
        setError(err);
        if (opts.error !== false) {
          const title = typeof opts.error === "function" ? opts.error(err, ...args) : (opts.error ?? errorMessage(err));
          const description = opts.error && err.code !== "VALIDATION_ERROR" ? err.message : undefined;
          toast.error(title, description && description !== title ? { description } : undefined);
        }
        opts.onError?.(err, ...args);
        return undefined;
      } finally {
        setPending(false);
        opts.onSettled?.(...args);
      }
    },
    [toast],
  );

  return {
    mutate,
    pending,
    error,
    fieldErrors: error?.fieldErrors ?? {},
    reset: () => setError(null),
  };
}
