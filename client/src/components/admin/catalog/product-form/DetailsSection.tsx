"use client";
/** Product form → Details: name, code, brand, category, description and fabric/occasion/care. */
import { FormField } from "@/components/admin/FormField";
import { Input } from "@/components/admin/Input";
import { Select } from "@/components/admin/Select";
import { Textarea } from "@/components/admin/Textarea";
import { categoryOptions, type FlatCategory } from "@/lib/admin/helpers/categories";
import type { FormErrors, ProductValues } from "./model";
import { Section } from "../../shared/Section";

type Setter = <K extends keyof ProductValues>(key: K, value: ProductValues[K]) => void;

export function DetailsSection({
  values,
  set,
  errors,
  categories,
  categoriesLoading,
}: {
  values: ProductValues;
  set: Setter;
  errors: FormErrors;
  categories: FlatCategory[];
  categoriesLoading: boolean;
}) {
  const text = (key: "name" | "code" | "brand" | "fabric" | "occasion" | "pattern") => ({
    value: values[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(key, e.target.value),
  });

  return (
    <Section id="details" title="Details">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Name" name="name" errors={errors} required className="sm:col-span-2">
          <Input {...text("name")} maxLength={160} autoComplete="off" />
        </FormField>
        <FormField label="Product code" name="code" errors={errors} required hint="Unique, e.g. APS-SAR-099. Used in SKUs.">
          <Input {...text("code")} maxLength={40} autoComplete="off" className="font-mono uppercase" />
        </FormField>
        <FormField label="Brand" name="brand" errors={errors}>
          <Input {...text("brand")} maxLength={80} />
        </FormField>
        <FormField label="Category" name="categoryId" errors={errors} required className="sm:col-span-2">
          <Select
            value={values.categoryId}
            onChange={(e) => set("categoryId", e.target.value)}
            disabled={categoriesLoading && categories.length === 0}
          >
            <option value="">{categoriesLoading ? "Loading categories…" : "Choose a category"}</option>
            {categoryOptions(categories).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Description" name="description" errors={errors} required className="sm:col-span-2">
          <Textarea rows={6} value={values.description} maxLength={10000} onChange={(e) => set("description", e.target.value)} />
        </FormField>
        <FormField label="Fabric" name="fabric" errors={errors}>
          <Input {...text("fabric")} maxLength={80} placeholder="e.g. Pure silk" />
        </FormField>
        <FormField label="Occasion" name="occasion" errors={errors}>
          <Input {...text("occasion")} maxLength={80} placeholder="e.g. Wedding" />
        </FormField>
        <FormField label="Pattern" name="pattern" errors={errors}>
          <Input {...text("pattern")} maxLength={80} placeholder="e.g. Zari" />
        </FormField>
        <FormField label="Care instructions" name="careInstructions" errors={errors} className="sm:col-span-2">
          <Textarea rows={3} value={values.careInstructions} maxLength={2000} onChange={(e) => set("careInstructions", e.target.value)} />
        </FormField>
      </div>
    </Section>
  );
}
