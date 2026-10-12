/**
 * LoadError: a card with the error state and a retry button, for pages whose data
 * failed to load. A 404 (or `error={null}`, e.g. an invalid id) shows "not found"
 * with no retry.
 *
 *   if (error && !data) return <LoadError title="Couldn't load this order" error={error} onRetry={reload} />;
 *   <LoadError title="…" error={null} notFoundTitle="Product not found" action={<ButtonLink …>Back</ButtonLink>} />
 */
import { Button } from "@/components/admin/Button";
import { EmptyState } from "@/components/admin/EmptyState";
import { card } from "@/components/admin/styles";
import type { ApiError } from "@/lib/api";
import { errorMessage } from "@/lib/admin/errors";

interface Props {
  title: string;
  error: ApiError | null;
  onRetry?: () => void;
  action?: React.ReactNode;
  notFoundTitle?: string;
}

export function LoadError({ title, error, onRetry, action, notFoundTitle = "Not found" }: Props) {
  const notFound = !error || error.status === 404;
  return (
    <div className={card}>
      <EmptyState
        tone="error"
        title={notFound ? notFoundTitle : title}
        description={error ? errorMessage(error) : "That item no longer exists."}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            {!notFound && onRetry && <Button onClick={onRetry}>Try again</Button>}
            {action}
          </div>
        }
      />
    </div>
  );
}
