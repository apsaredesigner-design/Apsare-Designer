"use client";
/**
 * SaveBar: sticky footer for the product form with a dirty-state indicator,
 * "Save as draft" (isActive: false) and "Publish" / "Save changes" (isActive: true).
 */
import { Button, ButtonLink } from "@/components/admin/Button";
import { cx } from "@/components/admin/styles";

export function SaveBar({
  dirty,
  isNew,
  wasActive,
  pending,
  onSave,
}: {
  dirty: boolean;
  isNew: boolean;
  wasActive: boolean;
  pending: "draft" | "publish" | null;
  onSave: (publish: boolean) => void;
}) {
  const status = isNew ? "Not saved yet" : dirty ? "Unsaved changes" : "All changes saved";
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-8 border-t border-ink/10 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <p className="flex items-center gap-2 text-sm text-ink/70" role="status">
          <span aria-hidden className={cx("size-2 rounded-full", dirty || isNew ? "bg-gold-500" : "bg-sage-500")} />
          {status}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:ml-auto sm:flex">
          <ButtonLink href="/admin/products" variant="ghost" className="col-span-2 sm:col-span-1">
            {dirty ? "Discard" : "Back to products"}
          </ButtonLink>
          <Button type="button" variant="secondary" loading={pending === "draft"} disabled={pending !== null} onClick={() => onSave(false)}>
            {wasActive ? "Unpublish & save" : "Save as draft"}
          </Button>
          <Button type="button" loading={pending === "publish"} disabled={pending !== null} onClick={() => onSave(true)}>
            {wasActive ? "Save changes" : "Publish"}
          </Button>
        </div>
      </div>
    </div>
  );
}
