"use client";
/** Admin settings: store delivery charges and serviceable pincodes. */
import { PageHeader } from "@/components/admin/PageHeader";
import { PincodesPanel } from "./PincodesPanel";
import { StoreSettingsForm } from "./StoreSettingsForm";

export function SettingsView() {
  return (
    <>
      <PageHeader title="Settings" description="Delivery charges and where the store ships." />
      <div className="flex flex-col gap-8">
        <StoreSettingsForm />
        <PincodesPanel />
      </div>
    </>
  );
}
