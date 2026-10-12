"use client";
/** ReviewDrawer: the full review (product, customer, rating, comment) with a delete action. */
import Link from "next/link";
import { Button } from "@/components/admin/Button";
import { Drawer } from "@/components/admin/Drawer";
import { TrashIcon } from "@/components/admin/icons";
import { cx, focusRing } from "@/components/admin/styles";
import { formatDateTime } from "@/lib/admin/format";
import type { AdminReview } from "@/lib/admin/types";
import { Stars } from "../../shared/Stars";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-[0.08em] text-ink/55 uppercase">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{children}</dd>
    </div>
  );
}

export function ReviewDrawer({ review, onClose, onDelete }: { review: AdminReview | null; onClose: () => void; onDelete: (r: AdminReview) => void }) {
  return (
    <Drawer
      open={review !== null}
      onClose={onClose}
      title="Review"
      width="w-[min(30rem,92vw)]"
      footer={
        review && (
          <Button variant="danger" icon={<TrashIcon />} onClick={() => onDelete(review)}>
            Delete review
          </Button>
        )
      }
    >
      {review && (
        <dl className="flex flex-col gap-5 px-6 py-5">
          <Row label="Product">
            <Link href={`/admin/products/${review.product.id}/edit`} className={cx("rounded font-semibold underline-offset-4 hover:underline", focusRing)}>
              {review.product.name}
            </Link>
            <span className="block font-mono text-xs text-ink/50">{review.product.code}</span>
          </Row>
          <Row label="Customer">
            {review.user.fullName}
            <span className="block text-xs text-ink/55">{review.user.email}</span>
          </Row>
          <Row label="Rating">
            <Stars rating={review.rating} />
          </Row>
          <Row label="Posted">{formatDateTime(review.createdAt)}</Row>
          <Row label="Comment">
            {review.comment?.trim() ? (
              <p className="leading-relaxed whitespace-pre-line">{review.comment}</p>
            ) : (
              <em className="text-ink/50">No comment, rating only.</em>
            )}
          </Row>
        </dl>
      )}
    </Drawer>
  );
}
