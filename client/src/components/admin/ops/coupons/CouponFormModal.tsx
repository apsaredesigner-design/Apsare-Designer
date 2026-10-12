"use client";
/**
 * Create/edit coupon Modal. Code is upper-cased as you type; max discount only for
 * PERCENT; client checks mirror the server (MAX_PERCENT / MAX_FLAT, start < end, integer limits).
 */
import { useState } from "react";
import { Button } from "@/components/admin/Button";
import { Checkbox } from "@/components/admin/Checkbox";
import { FormField } from "@/components/admin/FormField";
import { Input } from "@/components/admin/Input";
import { Modal } from "@/components/admin/Modal";
import { Select } from "@/components/admin/Select";
import { Switch } from "@/components/admin/Switch";
import { Textarea } from "@/components/admin/Textarea";
import { adminApi } from "@/lib/admin/api";
import {
  couponToForm,
  MAX_FLAT,
  MAX_PER_USER_LIMIT,
  MAX_PERCENT,
  toCouponBody,
  validateCouponForm,
  type CouponForm,
} from "@/lib/admin/helpers/coupons";
import type { AdminCoupon, AdminCouponListItem } from "@/lib/admin/types";
import { useMutation } from "@/lib/admin/use-mutation";

interface Props {
  coupon: AdminCouponListItem | null; // null = create
  onClose: () => void;
  onSaved: (c: AdminCoupon) => void;
}

export function CouponFormModal({ coupon, onClose, onSaved }: Props) {
  const [form, setForm] = useState<CouponForm>(() => couponToForm(coupon ?? undefined));
  const [touched, setTouched] = useState(false);
  const set = <K extends keyof CouponForm>(k: K, v: CouponForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation(
    (f: CouponForm) => (coupon ? adminApi.coupons.update(coupon.id, toCouponBody(f)) : adminApi.coupons.create(toCouponBody(f))),
    { success: coupon ? "Coupon updated" : "Coupon created", onSuccess: onSaved },
  );
  const local = touched ? validateCouponForm(form) : {};
  const errors = { ...save.fieldErrors, ...local };
  const id = "coupon-form";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (Object.keys(validateCouponForm(form)).length === 0) void save.mutate(form);
  };

  const num = (k: "value" | "maxDiscount" | "minOrderAmount" | "usageLimit" | "perUserLimit") => ({
    type: "number" as const,
    inputMode: "numeric" as const,
    min: 0,
    step: 1,
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(k, e.target.value),
  });

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      dismissible={!save.pending}
      title={coupon ? `Edit ${coupon.code}` : "New coupon"}
      description="Times are in IST. Leave limits blank for no limit."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={save.pending}>Cancel</Button>
          <Button type="submit" form={id} loading={save.pending}>{coupon ? "Save changes" : "Create coupon"}</Button>
        </>
      }
    >
      <form id={id} onSubmit={submit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Code" name="code" errors={errors} hint="3–30 letters, digits, _ or -" required>
          <Input value={form.code} maxLength={30} autoComplete="off" className="font-mono uppercase" onChange={(e) => set("code", e.target.value.toUpperCase().replace(/\s/g, ""))} />
        </FormField>
        <FormField label="Type" name="type" errors={errors} required>
          <Select
            value={form.type}
            onChange={(e) => set("type", e.target.value as CouponForm["type"])}
            options={[{ value: "PERCENT", label: "Percent off" }, { value: "FLAT", label: "Flat amount off" }]}
          />
        </FormField>
        <FormField label={form.type === "PERCENT" ? "Percent" : "Amount off"} name="value" errors={errors} hint={form.type === "PERCENT" ? `At most ${MAX_PERCENT}%` : undefined} required>
          <Input {...num("value")} max={form.type === "PERCENT" ? MAX_PERCENT : MAX_FLAT} prefix={form.type === "FLAT" ? "₹" : undefined} suffix={form.type === "PERCENT" ? "%" : undefined} />
        </FormField>
        {form.type === "PERCENT" ? (
          <FormField label="Max discount" name="maxDiscount" errors={errors} hint="Optional cap in rupees">
            <Input {...num("maxDiscount")} prefix="₹" />
          </FormField>
        ) : (
          <div className="hidden sm:block" />
        )}
        <FormField label="Minimum order" name="minOrderAmount" errors={errors} hint="Cart subtotal needed; 0 for none">
          <Input {...num("minOrderAmount")} prefix="₹" />
        </FormField>
        <FormField label="Total usage limit" name="usageLimit" errors={errors}>
          <Input {...num("usageLimit")} min={1} placeholder="Unlimited" />
        </FormField>
        <FormField label="Uses per customer" name="perUserLimit" errors={errors}>
          <Input {...num("perUserLimit")} min={1} max={MAX_PER_USER_LIMIT} placeholder="Unlimited" />
        </FormField>
        <div className="flex items-end">
          <Checkbox label="First order only" description="Only customers with no earlier order" checked={form.firstOrderOnly} onChange={(e) => set("firstOrderOnly", e.target.checked)} />
        </div>
        <FormField label="Starts" name="startsAt" errors={errors} hint="Blank = immediately">
          <Input type="datetime-local" value={form.startsAt} max={form.expiresAt || undefined} onChange={(e) => set("startsAt", e.target.value)} />
        </FormField>
        <FormField label="Expires" name="expiresAt" errors={errors} hint="Blank = never">
          <Input type="datetime-local" value={form.expiresAt} min={form.startsAt || undefined} onChange={(e) => set("expiresAt", e.target.value)} />
        </FormField>
        <FormField label="Description" name="description" errors={errors} className="sm:col-span-2">
          <Textarea rows={2} maxLength={300} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Shown to shoppers when they apply it" />
        </FormField>
        <Switch label="Active" description="Inactive coupons can't be applied" checked={form.isActive} onChange={(v) => set("isActive", v)} className="sm:col-span-2" />
      </form>
    </Modal>
  );
}
