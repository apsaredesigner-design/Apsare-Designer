"use client";
/**
 * CategoryFormModal: create or edit a category.
 *
 *   <CategoryFormModal key={formKey} open target={{ kind: "create", parentId: 3 }} flat={flat} tree={tree} onClose={…} onSaved={…} />
 *
 * - The slug follows the name until edited; editing an existing slug warns that
 *   /category/<old-slug> links stop working.
 * - The parent select excludes the category itself and its descendants; a stale
 *   tree can still give 409 CATEGORY_CYCLE, which is shown on the parent field.
 * - Image: upload one (ImageUploader) or paste a URL (http(s) or a /site path).
 * - Position (`sortOrder`, 0–10000): lower comes first among siblings. A new
 *   category defaults to the end of its parent's list.
 * Remount (change `key`) per open so the fields reset.
 */
import { useState } from "react";
import { Button } from "@/components/admin/Button";
import { FormField } from "@/components/admin/FormField";
import { WarningIcon } from "@/components/admin/icons";
import { ImageUploader, type UploaderImage } from "@/components/admin/ImageUploader";
import { Input } from "@/components/admin/Input";
import { Modal } from "@/components/admin/Modal";
import { Select } from "@/components/admin/Select";
import { Switch } from "@/components/admin/Switch";
import { Textarea } from "@/components/admin/Textarea";
import type { ApiError } from "@/lib/api";
import { adminApi } from "@/lib/admin/api";
import { CATEGORY_SORT_MAX, categoryOptions, descendantIds, slugify, type FlatCategory } from "@/lib/admin/helpers/categories";
import { isSafeUrl } from "@/lib/admin/helpers/safe-url";
import type { AdminCategory, AdminCategoryInput, CategoryTreeNode } from "@/lib/admin/types";
import { useMutation } from "@/lib/admin/use-mutation";

export type CategoryTarget = { kind: "create"; parentId: number | null } | { kind: "edit"; node: CategoryTreeNode };

const URL_HINT = "An https:// link or a site path starting with /";

/** Next free position under `parentId` (end of the list). */
function nextSortOrder(flat: FlatCategory[], parentId: number | null): number {
  const siblings = flat.filter((f) => f.node.parentId === parentId).map((f) => f.node.sortOrder);
  return siblings.length ? Math.min(Math.max(...siblings) + 1, CATEGORY_SORT_MAX) : 0;
}

function serverErrors(err: ApiError): Record<string, string> {
  if (err.code === "CATEGORY_CYCLE") return { parentId: err.message };
  if (err.status === 409 && err.fieldErrors.slug) return { slug: "Another category already uses this slug" };
  return err.fieldErrors;
}

export function CategoryFormModal({
  open,
  target,
  flat,
  onClose,
  onSaved,
}: {
  open: boolean;
  target: CategoryTarget;
  flat: FlatCategory[];
  onClose: () => void;
  onSaved: (c: AdminCategory) => void;
}) {
  const node = target.kind === "edit" ? target.node : null;
  const [name, setName] = useState(node?.name ?? "");
  const [slug, setSlug] = useState(node?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(node));
  const [description, setDescription] = useState(node?.description ?? "");
  const [parentId, setParentId] = useState(String(node ? (node.parentId ?? "") : (target.kind === "create" ? (target.parentId ?? "") : "")));
  const [isActive, setActive] = useState(node?.isActive ?? true);
  const [imageUrl, setImageUrl] = useState(node?.imageUrl ?? "");
  const [sortOrder, setSortOrder] = useState(() =>
    String(node ? node.sortOrder : nextSortOrder(flat, target.kind === "create" ? target.parentId : null)),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const exclude = node ? descendantIds(node, new Set([node.id])) : undefined;
  const cleanUrl = imageUrl.trim();
  const images: UploaderImage[] = cleanUrl && isSafeUrl(cleanUrl) ? [{ url: cleanUrl, publicId: null, alt: name }] : [];
  const slugChanged = node !== null && slug !== node.slug;

  const save = useMutation(
    (body: AdminCategoryInput) => (node ? adminApi.categories.update(node.id, body) : adminApi.categories.create(body)),
    {
      success: (c) => `Category “${c.name}” ${node ? "updated" : "created"}`,
      onSuccess: onSaved,
      onError: (err) => setErrors(serverErrors(err)),
    },
  );

  const submit = () => {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = "At least 2 characters";
    if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) e.slug = "Lowercase letters, digits and single hyphens";
    const img = imageUrl.trim();
    if (img && !isSafeUrl(img)) e.imageUrl = URL_HINT;
    if (!/^\d+$/.test(sortOrder.trim()) || Number(sortOrder) > CATEGORY_SORT_MAX) e.sortOrder = `A whole number from 0 to ${CATEGORY_SORT_MAX}`;
    setErrors(e);
    if (Object.keys(e).length) return;
    save.mutate({
      name: name.trim(),
      ...(slug && (!node || slugChanged) ? { slug } : {}),
      description: description.trim() || null,
      parentId: parentId ? Number(parentId) : null,
      imageUrl: imageUrl.trim() || null,
      sortOrder: Number(sortOrder),
      isActive,
    });
  };

  const formId = "category-form";
  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!save.pending}
      title={node ? `Edit “${node.name}”` : "New category"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={save.pending}>Cancel</Button>
          <Button type="submit" form={formId} loading={save.pending}>{node ? "Save changes" : "Create category"}</Button>
        </>
      }
    >
      <form
        id={formId}
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <FormField label="Name" name="name" errors={errors} required>
          <Input
            value={name}
            maxLength={80}
            autoFocus
            onChange={(e) => {
              setName(e.target.value);
              if (!slugEdited) setSlug(slugify(e.target.value));
            }}
          />
        </FormField>
        <FormField
          label="Slug"
          name="slug"
          errors={errors}
          hint={node ? "Renaming never changes the slug." : "Generated from the name. Used in the URL /category/<slug>."}
        >
          <Input
            value={slug}
            maxLength={80}
            className="font-mono"
            onChange={(e) => {
              setSlugEdited(true);
              setSlug(e.target.value.toLowerCase());
            }}
          />
        </FormField>
        {slugChanged && (
          <p role="status" className="-mt-2 flex gap-2 rounded-md bg-gold-300/20 px-3 py-2 text-xs text-ink">
            <WarningIcon className="mt-px size-4 shrink-0 text-gold-700" />
            Changing the slug changes this category&apos;s URL. Old /category/{node.slug} links will stop working (banner links are updated
            automatically).
          </p>
        )}
        <FormField label="Parent category" name="parentId" errors={errors}>
          <Select value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value="">None (top level)</option>
            {categoryOptions(flat, exclude).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Position" name="sortOrder" errors={errors} hint="Lower numbers come first among categories with the same parent.">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={CATEGORY_SORT_MAX}
            step={1}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="max-w-40"
          />
        </FormField>
        <FormField label="Description" name="description" errors={errors}>
          <Textarea rows={3} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} />
        </FormField>
        <ImageUploader
          label="Category image"
          value={images}
          onChange={(imgs) => setImageUrl(imgs[0]?.url ?? "")}
          max={1}
          withAlt={false}
          hint="Optional. Shown on category tiles in the store."
        />
        <FormField label="Image URL" name="imageUrl" errors={errors} hint="Filled in by the upload, or paste a link">
          <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://… or /images/categories/…" inputMode="url" />
        </FormField>
        <Switch label="Active" description="Inactive categories are hidden from the store." checked={isActive} onChange={setActive} />
      </form>
    </Modal>
  );
}
