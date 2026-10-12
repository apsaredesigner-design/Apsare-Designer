"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api";
import { Plus, Edit2, Trash2, MapPin, Check } from "lucide-react";
import type { Address } from "@/types";

export default function AddressesPage() {
  const toast = useToast();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Address Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form fields
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [landmark, setLandmark] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadAddresses = useCallback(async () => {
    try {
      const data = await api<{ items: Address[] }>("/addresses");
      setAddresses(data.items);
    } catch {
      toast.error("Failed to load saved addresses");
    }
  }, [toast]);

  useEffect(() => {
    let active = true;
    api<{ items: Address[] }>("/addresses")
      .then((data) => {
        if (active) setAddresses(data.items);
      })
      .catch(() => {
        toast.error("Failed to load saved addresses");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [toast]);

  const openAddModal = () => {
    setEditingAddress(null);
    setFullName("");
    setMobile("");
    setLine1("");
    setLine2("");
    setLandmark("");
    setCity("");
    setState("");
    setPincode("");
    setIsDefault(addresses.length === 0);
    setErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (addr: Address) => {
    setEditingAddress(addr);
    setFullName(addr.fullName);
    setMobile(addr.mobile);
    setLine1(addr.line1);
    setLine2(addr.line2 || "");
    setLandmark(addr.landmark || "");
    setCity(addr.city);
    setState(addr.state);
    setPincode(addr.pincode);
    setIsDefault(addr.isDefault);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: Record<string, string> = {};
    if (!fullName.trim()) newErrors.fullName = "Recipient name is required";
    if (!/^[6-9]\d{9}$/.test(mobile.trim())) newErrors.mobile = "10-digit mobile required";
    if (!line1.trim()) newErrors.line1 = "Address line 1 is required";
    if (!city.trim()) newErrors.city = "City is required";
    if (!state.trim()) newErrors.state = "State is required";
    if (!/^\d{6}$/.test(pincode.trim())) newErrors.pincode = "6-digit PIN code required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload = {
      fullName: fullName.trim(),
      mobile: mobile.trim(),
      line1: line1.trim(),
      line2: line2.trim() || null,
      landmark: landmark.trim() || null,
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      isDefault,
    };

    setIsSaving(true);
    try {
      if (editingAddress) {
        await api(`/addresses/${editingAddress.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.success("Address updated successfully!");
      } else {
        await api("/addresses", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("New address saved!");
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) {
        setErrors(err.fieldErrors);
      } else {
        const message = err instanceof Error ? err.message : "Failed to save address";
        toast.error(message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to remove this address?")) return;
    try {
      await api(`/addresses/${id}`, { method: "DELETE" });
      toast.success("Address removed");
      await loadAddresses();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to remove address";
      toast.error(message);
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      await api(`/addresses/${id}/default`, { method: "PATCH" });
      toast.success("Default address updated");
      await loadAddresses();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to set default address";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-sage-200 bg-white p-6 shadow-xs">
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink">
            Saved Addresses
          </h2>
          <p className="text-xs text-ink/60 mt-0.5">
            Manage your doorstep shipping locations for fast, seamless checkouts.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={openAddModal}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Add New Address
        </Button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-xs text-ink/60">
          Loading addresses…
        </div>
      ) : addresses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-sage-300 p-12 text-center">
          <MapPin className="mx-auto h-10 w-10 text-sage-400 mb-3" />
          <h3 className="font-display text-xl font-semibold text-ink">
            No Addresses Saved
          </h3>
          <p className="text-xs text-ink/60 mt-1 max-w-sm mx-auto">
            Save your home or delivery address to speed through future orders.
          </p>
          <div className="mt-6">
            <Button variant="outline" size="sm" onClick={openAddModal}>
              Add Your First Address
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className={`flex flex-col justify-between rounded-xl border p-5 transition ${
                addr.isDefault
                  ? "border-gold-500 bg-sage-50/50 shadow-xs"
                  : "border-sage-200 bg-white hover:border-sage-300"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-semibold text-sm text-ink">
                    {addr.fullName}
                  </span>
                  {addr.isDefault && (
                    <Badge variant="gold" size="sm">
                      Default
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-ink/75 leading-relaxed">
                  {addr.line1}
                  {addr.line2 && <>, {addr.line2}</>}
                  {addr.landmark && <>, Near {addr.landmark}</>}
                  <br />
                  {addr.city}, {addr.state} — <strong>{addr.pincode}</strong>
                </p>

                <p className="mt-3 text-xs text-ink/60 font-medium">
                  Mobile: {addr.mobile}
                </p>
              </div>

              {/* Action buttons */}
              <div className="mt-5 flex items-center justify-between border-t border-sage-200/80 pt-3 text-xs">
                {!addr.isDefault ? (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(addr.id)}
                    className="font-medium text-gold-600 hover:text-ink cursor-pointer"
                  >
                    Set as Default
                  </button>
                ) : (
                  <span className="text-[11px] text-sage-600 font-semibold flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    <span>Default Address</span>
                  </span>
                )}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => openEditModal(addr)}
                    className="text-ink/60 hover:text-ink cursor-pointer p-1"
                    aria-label="Edit address"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(addr.id)}
                    className="text-ink/40 hover:text-sale cursor-pointer p-1"
                    aria-label="Delete address"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Address Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAddress ? "Edit Shipping Address" : "Add Shipping Address"}
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Recipient Full Name"
              placeholder="Ananya Rao"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              error={errors.fullName}
            />
            <Input
              label="10-Digit Mobile"
              type="tel"
              maxLength={10}
              placeholder="9876543210"
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
              error={errors.mobile}
            />
          </div>

          <Input
            label="Street Address / Flat / Building (Line 1)"
            placeholder="Flat 402, Lotus Residency, MG Road"
            value={line1}
            onChange={(e) => setLine1(e.target.value)}
            error={errors.line1}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Apartment, Suite, Unit (Line 2, Optional)"
              placeholder="Floor 4, Block B"
              value={line2}
              onChange={(e) => setLine2(e.target.value)}
            />
            <Input
              label="Landmark (Optional)"
              placeholder="Opposite City Mall"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="City"
              placeholder="Bengaluru"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              error={errors.city}
            />
            <Input
              label="State"
              placeholder="Karnataka"
              value={state}
              onChange={(e) => setState(e.target.value)}
              error={errors.state}
            />
            <Input
              label="6-Digit PIN Code"
              type="text"
              maxLength={6}
              placeholder="560001"
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
              error={errors.pincode}
            />
          </div>

          <div className="pt-1">
            <Checkbox
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              label="Make this my default shipping address"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-sage-200">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSaving}
            >
              Save Address
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
