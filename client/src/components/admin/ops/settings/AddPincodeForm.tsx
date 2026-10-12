"use client";
/** Inline form to add one serviceable pincode (409 if it is already listed). */
import { useState } from "react";
import { Button } from "@/components/admin/Button";
import { Checkbox } from "@/components/admin/Checkbox";
import { FormField } from "@/components/admin/FormField";
import { PlusIcon } from "@/components/admin/icons";
import { Input } from "@/components/admin/Input";
import { adminApi } from "@/lib/admin/api";
import { PINCODE_RE } from "@/lib/admin/helpers/settings";
import type { PincodeInput } from "@/lib/admin/types";
import { useMutation } from "@/lib/admin/use-mutation";

export function AddPincodeForm({ onAdded }: { onAdded: () => void }) {
  const [pincode, setPincode] = useState("");
  const [days, setDays] = useState("5");
  const [cod, setCod] = useState(true);
  const [touched, setTouched] = useState(false);
  const add = useMutation((body: PincodeInput) => adminApi.settings.pincodes.create(body), {
    success: (p) => `${p.pincode} added`,
    onSuccess: () => { setPincode(""); setTouched(false); onAdded(); },
  });
  const errors: Record<string, string> = { ...add.fieldErrors };
  if (touched && !PINCODE_RE.test(pincode)) errors.pincode = "6 digits, not starting with 0";
  const d = Number(days);
  if (touched && !(/^\d+$/.test(days) && d >= 1 && d <= 30)) errors.deliveryDays = "1 to 30";

  return (
    <form
      noValidate
      aria-label="Add a pincode"
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (PINCODE_RE.test(pincode) && /^\d+$/.test(days) && d >= 1 && d <= 30) void add.mutate({ pincode, deliveryDays: d, codAvailable: cod });
      }}
      className="grid grid-cols-2 items-start gap-3 sm:flex sm:flex-wrap sm:items-end"
    >
      <FormField label="Pincode" name="pincode" errors={errors} className="sm:w-36">
        <Input value={pincode} inputMode="numeric" maxLength={6} autoComplete="off" onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))} placeholder="560001" />
      </FormField>
      <FormField label="Delivery days" name="deliveryDays" errors={errors} className="sm:w-32">
        <Input type="number" inputMode="numeric" min={1} max={30} step={1} value={days} onChange={(e) => setDays(e.target.value)} />
      </FormField>
      <Checkbox label="COD available" checked={cod} onChange={(e) => setCod(e.target.checked)} />
      <Button type="submit" icon={<PlusIcon />} loading={add.pending} className="sm:mb-0">Add</Button>
    </form>
  );
}
