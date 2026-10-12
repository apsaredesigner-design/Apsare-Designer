"use client";
/**
 * Create/edit banner Modal: ImageUploader (one image) or a pasted URL, title, subtitle,
 * CTA label/link and active. The server rejects unsafe URLs; its message is shown
 * on the field (and checked client-side first).
 */
import { useState } from "react";
import { Button } from "@/components/admin/Button";
import { FormField } from "@/components/admin/FormField";
import { ImageUploader, type UploaderImage } from "@/components/admin/ImageUploader";
import { Input } from "@/components/admin/Input";
import { Modal } from "@/components/admin/Modal";
import { Switch } from "@/components/admin/Switch";
import { adminApi } from "@/lib/admin/api";
import { isSafeUrl } from "@/lib/admin/helpers/safe-url";
import type { AdminBannerInput, Banner } from "@/lib/admin/types";
import { useMutation } from "@/lib/admin/use-mutation";

const URL_HINT = "An https:// link or a site path starting with /";

export function BannerFormModal({ banner, onClose, onSaved }: { banner: Banner | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(banner?.title ?? "");
  const [subtitle, setSubtitle] = useState(banner?.subtitle ?? "");
  const [imageUrl, setImageUrl] = useState(banner?.imageUrl ?? "");
  const [ctaLabel, setCtaLabel] = useState(banner?.ctaLabel ?? "");
  const [ctaHref, setCtaHref] = useState(banner?.ctaHref ?? "");
  const [isActive, setIsActive] = useState(banner?.isActive ?? true);
  const [touched, setTouched] = useState(false);

  const save = useMutation(
    (body: AdminBannerInput) => (banner ? adminApi.banners.update(banner.id, body) : adminApi.banners.create(body)),
    { success: banner ? "Banner updated" : "Banner created", onSuccess: onSaved },
  );

  const local: Record<string, string> = {};
  if (touched) {
    if (!title.trim()) local.title = "Enter a title";
    if (!imageUrl.trim()) local.imageUrl = "Upload an image or paste its URL";
    else if (!isSafeUrl(imageUrl.trim())) local.imageUrl = URL_HINT;
    if (ctaHref.trim() && !isSafeUrl(ctaHref.trim())) local.ctaHref = URL_HINT;
    if (ctaHref.trim() && !ctaLabel.trim()) local.ctaLabel = "Add a button label for the link";
  }
  const errors = { ...save.fieldErrors, ...local };
  const images: UploaderImage[] = imageUrl.trim() && isSafeUrl(imageUrl.trim()) ? [{ url: imageUrl.trim(), publicId: null, alt: title }] : [];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    const t = title.trim(), img = imageUrl.trim(), href = ctaHref.trim();
    if (!t || !img || !isSafeUrl(img) || (href && (!isSafeUrl(href) || !ctaLabel.trim()))) return;
    void save.mutate({ title: t, subtitle: subtitle.trim() || null, imageUrl: img, ctaLabel: ctaLabel.trim() || null, ctaHref: href || null, isActive });
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      dismissible={!save.pending}
      title={banner ? "Edit banner" : "New banner"}
      description="Shown in the home page hero carousel, in the order set on this page."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={save.pending}>Cancel</Button>
          <Button type="submit" form="banner-form" loading={save.pending}>{banner ? "Save changes" : "Create banner"}</Button>
        </>
      }
    >
      <form id="banner-form" onSubmit={submit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <ImageUploader label="Banner image" value={images} onChange={(imgs) => setImageUrl(imgs[0]?.url ?? "")} max={1} withAlt={false} hint="Wide images work best (about 16:6)." />
        </div>
        <FormField label="Image URL" name="imageUrl" errors={errors} hint="Filled in by the upload, or paste a link" required className="sm:col-span-2">
          <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://… or /images/banners/…" inputMode="url" />
        </FormField>
        <FormField label="Title" name="title" errors={errors} required>
          <Input value={title} maxLength={150} onChange={(e) => setTitle(e.target.value)} />
        </FormField>
        <FormField label="Subtitle" name="subtitle" errors={errors}>
          <Input value={subtitle} maxLength={250} onChange={(e) => setSubtitle(e.target.value)} />
        </FormField>
        <FormField label="Button label" name="ctaLabel" errors={errors}>
          <Input value={ctaLabel} maxLength={50} onChange={(e) => setCtaLabel(e.target.value)} placeholder="Shop now" />
        </FormField>
        <FormField label="Button link" name="ctaHref" errors={errors}>
          <Input value={ctaHref} onChange={(e) => setCtaHref(e.target.value)} placeholder="/new-arrivals" inputMode="url" />
        </FormField>
        <Switch label="Active" description="Inactive banners are hidden from the storefront" checked={isActive} onChange={setIsActive} className="sm:col-span-2" />
      </form>
    </Modal>
  );
}
