"use client";
/**
 * useAdminQuery: GET a JSON resource with loading/error state and abort on change.
 *
 *   const { data, loading, error, reload, setData } = useAdminQuery<AdminProduct>(`/admin/products/${id}`);
 *
 * - Pass `null` as the path to skip fetching.
 * - Changing the path aborts the in-flight request (AbortController).
 * - `data` keeps the last successful result while a new request loads (so lists
 *   don't flash); `loading` is true until the current path settles.
 * - A 401 sends the admin to /admin/login?reason=expired (via adminGet).
 * - `setData(fn)` updates the cached value locally (e.g. after a mutation).
 */
import { useCallback, useEffect, useState } from "react";
import type { ApiError } from "@/lib/api";
import { adminGet } from "./api";
import { isAbortError, toApiError } from "./errors";

interface State<T> {
  key: string;
  data?: T;
  error?: ApiError;
}

export interface AdminQuery<T> {
  data: T | undefined;
  loading: boolean;
  error: ApiError | null;
  reload: () => void;
  setData: (update: (prev: T | undefined) => T | undefined) => void;
}

export function useAdminQuery<T>(path: string | null): AdminQuery<T> {
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<State<T> | null>(null);
  const requestKey = path === null ? null : `${nonce}|${path}`;

  useEffect(() => {
    if (requestKey === null || path === null) return;
    const controller = new AbortController();
    adminGet<T>(path, { signal: controller.signal }).then(
      (data) => setState({ key: requestKey, data }),
      (e: unknown) => {
        if (controller.signal.aborted || isAbortError(e)) return;
        setState((prev) => ({ key: requestKey, data: prev?.data, error: toApiError(e) }));
      },
    );
    return () => controller.abort();
  }, [path, requestKey]);

  const settled = state !== null && state.key === requestKey;
  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const setData = useCallback(
    (update: (prev: T | undefined) => T | undefined) =>
      setState((prev) => (prev ? { ...prev, data: update(prev.data) } : prev)),
    [],
  );

  return {
    data: state?.data,
    loading: requestKey !== null && !settled,
    error: settled ? (state.error ?? null) : null,
    reload,
    setData,
  };
}
