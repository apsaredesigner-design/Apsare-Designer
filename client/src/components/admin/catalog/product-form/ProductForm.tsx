"use client";
/**
 * ProductForm: the create/edit form shared by /admin/products/new and /[id]/edit.
 *
 *   <ProductForm />                          // create → redirects to the edit page
 *   <ProductForm product={p} onSaved={…} />  // edit (PATCH with the full body)
 *
 * Validates on the client first (same rules and field paths as the server), then maps
 * server `fieldErrors` (incl. "variants.2.sku") and 409s onto the fields, scrolling to
 * the first error. Tracks dirty state for the save bar and the beforeunload warning.
 */
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { useToast } from "@/components/admin/Toast";
import type { ApiError } from "@/lib/api";
import { adminApi } from "@/lib/admin/api";
import { PRODUCT_LIMITS } from "@/lib/admin/helpers/products";
import type { AdminProduct, AdminProductInput } from "@/lib/admin/types";
import { useMutation } from "@/lib/admin/use-mutation";
import { Section } from "../../shared/Section";
import { useCategoryTree } from "../../shared/useCategoryTree";
import { DetailsSection } from "./DetailsSection";
import { FlagsSection } from "./FlagsSection";
import { emptyValues, fingerprint, fromProduct, suggestSku, toInput, validate, type FormErrors, type ProductValues } from "./model";
import { PricingSection } from "./PricingSection";
import { SaveBar } from "./SaveBar";
import { SpecsSection } from "./SpecsSection";
import { useUnsavedChangesWarning } from "./useUnsavedChangesWarning";
import { VariantsSection } from "./VariantsSection";

/** Server errors → form errors, plus a section-level message for 409s. */
function mapServerError(err: ApiError): { errors: FormErrors; conflict?: string } {
  const errors: FormErrors = { ...err.fieldErrors };
  if (err.status !== 409) return { errors };
  if (errors.code) return { errors: { code: "Another product already uses this code" } };
  if (errors.sku) return { errors: {}, conflict: "One of these SKUs is already used by another product. Change it and save again." };
  return { errors: {}, conflict: err.message };
}

export function ProductForm({ product, onSaved }: { product?: AdminProduct; onSaved?: (p: AdminProduct) => void }) {
  const router = useRouter();
  const toast = useToast();
  const categories = useCategoryTree();
  const formRef = useRef<HTMLFormElement>(null);

  const [values, setValues] = useState<ProductValues>(() => (product ? fromProduct(product) : emptyValues()));
  const [baseline, setBaseline] = useState(() => fingerprint(values));
  const [errors, setErrors] = useState<FormErrors>({});
  const [conflict, setConflict] = useState<string>();
  const [mode, setMode] = useState<"draft" | "publish" | null>(null);
  const [scrollNonce, setScrollNonce] = useState(0);
  const [version, setVersion] = useState(0);

  const isNew = !product;
  const dirty = fingerprint(values) !== baseline;
  useUnsavedChangesWarning(dirty);

  useEffect(() => {
    if (!scrollNonce) return;
    const el = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-field-error]');
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    if (el.matches("input, select, textarea")) el.focus({ preventScroll: true });
  }, [scrollNonce]);

  const set = <K extends keyof ProductValues>(key: K, value: ProductValues[K]) => {
    setValues((v) => {
      const next = { ...v, [key]: value };
      // Keep auto-suggested SKUs in step with the product code.
      if (key === "code") next.variants = v.variants.map((r) => (r.skuEdited ? r : { ...r, sku: suggestSku(String(value), r.size, r.color) }));
      return next;
    });
    if (errors[key as string])
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key as string];
        return next;
      });
  };

  const save = useMutation(
    (body: AdminProductInput) => (product ? adminApi.products.update(product.id, body) : adminApi.products.create(body)),
    {
      onError: (err) => {
        const mapped = mapServerError(err);
        setErrors(mapped.errors);
        setConflict(mapped.conflict);
        setScrollNonce((n) => n + 1);
      },
    },
  );

  async function submit(publish: boolean) {
    const clientErrors = validate(values, publish);
    setConflict(undefined);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length) {
      toast.error("Please fix the highlighted fields.");
      setScrollNonce((n) => n + 1);
      return;
    }
    setMode(publish ? "publish" : "draft");
    const saved = await save.mutate(toInput(values, publish));
    setMode(null);
    if (!saved) return;

    const verb = publish ? (product?.isActive ? "saved" : "published") : "saved as draft";
    toast.success(`“${saved.name}” ${verb}`);
    const next = fromProduct(saved);
    setBaseline(fingerprint(next));
    if (isNew) {
      router.replace(`/admin/products/${saved.id}/edit`);
      return;
    }
    setValues(next);
    setVersion((n) => n + 1);
    onSaved?.(saved);
  }

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit(product ? product.isActive : false);
      }}
      aria-label={isNew ? "New product" : `Edit ${product.name}`}
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <DetailsSection values={values} set={set} errors={errors} categories={categories.flat} categoriesLoading={categories.loading} />
          <PricingSection values={values} set={set} errors={errors} />
          <Section id="images" title="Images" description="The first image is the cover. Drag or use the arrows to reorder." error={errors.images}>
            <ImageUploader
              label="Product images"
              value={values.images}
              onChange={(images) => set("images", images)}
              max={PRODUCT_LIMITS.images}
            />
          </Section>
          <VariantsSection
            key={`variants-${version}`}
            code={values.code}
            rows={values.variants}
            onChange={(rows) => set("variants", rows)}
            errors={errors}
            conflict={conflict}
          />
          <SpecsSection rows={values.specs} onChange={(rows) => set("specs", rows)} errors={errors} />
        </div>
        <div className="flex min-w-0 flex-col gap-6 xl:sticky xl:top-6 xl:self-start">
          <FlagsSection
            flags={values.flags}
            onFlag={(f, on) => set("flags", { ...values.flags, [f]: on })}
            isActive={product?.isActive ?? false}
            imageCount={values.images.length}
            variantCount={values.variants.length}
          />
        </div>
      </div>
      <SaveBar dirty={dirty} isNew={isNew} wasActive={product?.isActive ?? false} pending={mode} onSave={submit} />
    </form>
  );
}
