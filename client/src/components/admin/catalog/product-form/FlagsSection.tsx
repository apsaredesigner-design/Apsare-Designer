"use client";
/**
 * Product form → Visibility: the merchandising flags and the publish status with a
 * checklist of what an active product needs (≥ 1 image and ≥ 1 variant).
 * Publishing happens from the save bar ("Publish" / "Save as draft").
 */
import { Badge } from "@/components/admin/StatusBadge";
import { Switch } from "@/components/admin/Switch";
import { CheckIcon, CloseIcon } from "@/components/admin/icons";
import { cx } from "@/components/admin/styles";
import { PRODUCT_FLAGS, PRODUCT_FLAG_LABEL, type ProductFlag } from "@/lib/admin/helpers/products";
import { Section } from "../../shared/Section";

function Check({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className={cx("flex items-center gap-2 text-sm", ok ? "text-sage-700" : "text-ink/60")}>
      {ok ? <CheckIcon className="size-4" /> : <CloseIcon className="size-4 text-sale" />}
      <span>
        {children}
        <span className="sr-only">{ok ? " (done)" : " (missing)"}</span>
      </span>
    </li>
  );
}

export function FlagsSection({
  flags,
  onFlag,
  isActive,
  imageCount,
  variantCount,
}: {
  flags: Record<ProductFlag, boolean>;
  onFlag: (flag: ProductFlag, value: boolean) => void;
  isActive: boolean;
  imageCount: number;
  variantCount: number;
}) {
  return (
    <Section id="visibility" title="Visibility">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-ink/70">Status</span>
        <Badge tone={isActive ? "success" : "neutral"}>{isActive ? "Active · visible in store" : "Draft · hidden"}</Badge>
      </div>
      <ul className="mt-3 space-y-1" aria-label="Needed to publish">
        <Check ok={imageCount > 0}>At least one image ({imageCount})</Check>
        <Check ok={variantCount > 0}>At least one variant ({variantCount})</Check>
      </ul>

      <h3 className="mt-6 text-xs font-semibold tracking-[0.08em] text-ink/60 uppercase">Merchandising</h3>
      <div className="mt-1 grid gap-x-6 sm:grid-cols-2">
        {PRODUCT_FLAGS.map((f) => (
          <Switch key={f} label={PRODUCT_FLAG_LABEL[f]} checked={flags[f]} onChange={(v) => onFlag(f, v)} />
        ))}
      </div>
    </Section>
  );
}
