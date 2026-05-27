"use client";

import { Package, Plus, Sparkles, Trash2 } from "lucide-react";

import { SelectWithQuickAdd } from "@/components/select-with-quick-add";
import { cn } from "@/lib/utils";
import type { Brand } from "@/hooks/use-brands";
import type { CategoryRow } from "@/hooks/use-categories";

import type { InlineVariant } from "../types";
import {
  FieldLabel,
  FormSection,
  ToggleSwitch,
  fieldClass,
} from "./form-controls";

type BasicInfoSectionProps = {
  collapsed: boolean;
  onToggle: () => void;
  name: string;
  onNameChange: (value: string) => void;
  sku: string;
  onGenerateSku: () => void;
  onSkuChange: (value: string) => void;
  categoryId: string;
  onCategoryChange: (value: string) => void;
  categories: CategoryRow[];
  brandId: string;
  onBrandChange: (value: string) => void;
  brands: Brand[];
  hasInlineVariants: boolean;
  inlineVariants: InlineVariant[];
  showCost: boolean;
  onAddInlineVariant: () => void;
  onUpdateInlineVariant: (
    id: string,
    field: keyof InlineVariant,
    value: string,
  ) => void;
  onRemoveInlineVariant: (id: string) => void;
  onClearInlineVariants: () => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  isActive: boolean;
  onActiveChange: (value: boolean) => void;
  onQuickAddCategory: (name: string) => Promise<{ id: string } | null>;
  onQuickAddBrand: (name: string) => Promise<{ id: string } | null>;
};

export function BasicInfoSection({
  collapsed,
  onToggle,
  name,
  onNameChange,
  sku,
  onGenerateSku,
  onSkuChange,
  categoryId,
  onCategoryChange,
  categories,
  brandId,
  onBrandChange,
  brands,
  hasInlineVariants,
  inlineVariants,
  showCost,
  onAddInlineVariant,
  onUpdateInlineVariant,
  onRemoveInlineVariant,
  onClearInlineVariants,
  description,
  onDescriptionChange,
  isActive,
  onActiveChange,
  onQuickAddCategory,
  onQuickAddBrand,
}: BasicInfoSectionProps) {
  return (
    <FormSection
      id="basic"
      icon={Package}
      title="Basic Information"
      collapsed={collapsed}
      onToggle={onToggle}
    >
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <div className="col-span-2">
          <FieldLabel required>Item Name</FieldLabel>
          <input
            type="text"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="e.g. Cattleya Notebook 80 Leaves"
            autoFocus
            className={fieldClass}
          />
        </div>

        {!hasInlineVariants && (
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <label className="block text-[12px] font-medium text-muted-foreground">
                SKU <span className="text-destructive">*</span>
              </label>
              <button
                type="button"
                onClick={onGenerateSku}
                title="Auto-generate SKU"
                className="inline-flex h-6 items-center gap-1 rounded-md border border-border bg-background px-2 text-[11px] font-medium text-primary transition-colors hover:bg-primary/[0.06]"
              >
                <Sparkles size={12} />
                Generate SKU
              </button>
            </div>
            <input
              type="text"
              value={sku}
              onChange={(event) => onSkuChange(event.target.value.toUpperCase())}
              placeholder="e.g. NBK-050001"
              className={cn(fieldClass, "font-mono")}
            />
          </div>
        )}

        <SelectWithQuickAdd
          label="Category"
          value={categoryId}
          onChange={onCategoryChange}
          options={categories}
          placeholder="Select category..."
          labelClassName="text-[12px] font-medium text-muted-foreground"
          onQuickAdd={onQuickAddCategory}
        />

        <SelectWithQuickAdd
          label="Brand"
          value={brandId}
          onChange={onBrandChange}
          options={brands}
          placeholder="No Brand"
          labelClassName="text-[12px] font-medium text-muted-foreground"
          onQuickAdd={onQuickAddBrand}
        />

        <InlineVariantsEditor
          hasInlineVariants={hasInlineVariants}
          inlineVariants={inlineVariants}
          showCost={showCost}
          onAddInlineVariant={onAddInlineVariant}
          onUpdateInlineVariant={onUpdateInlineVariant}
          onRemoveInlineVariant={onRemoveInlineVariant}
          onClearInlineVariants={onClearInlineVariants}
        />

        <div className="col-span-2">
          <FieldLabel>Description / Notes</FieldLabel>
          <textarea
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            rows={2}
            placeholder="Internal notes, pack size, color, shelf location, or supplier details..."
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary/40 focus:ring-2 focus:ring-primary/[0.08]"
          />
        </div>

        <div className="col-span-2 flex items-center gap-2">
          <ToggleSwitch checked={isActive} onChange={onActiveChange} />
          <span className="text-[13px] text-foreground">Active in catalog</span>
        </div>
      </div>
    </FormSection>
  );
}

function InlineVariantsEditor({
  hasInlineVariants,
  inlineVariants,
  showCost,
  onAddInlineVariant,
  onUpdateInlineVariant,
  onRemoveInlineVariant,
  onClearInlineVariants,
}: {
  hasInlineVariants: boolean;
  inlineVariants: InlineVariant[];
  showCost: boolean;
  onAddInlineVariant: () => void;
  onUpdateInlineVariant: (
    id: string,
    field: keyof InlineVariant,
    value: string,
  ) => void;
  onRemoveInlineVariant: (id: string) => void;
  onClearInlineVariants: () => void;
}) {
  return (
    <div className="col-span-2 mt-1 space-y-3 rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-3">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={hasInlineVariants}
            onChange={(event) => {
              if (event.target.checked) {
                if (inlineVariants.length === 0) onAddInlineVariant();
              } else {
                onClearInlineVariants();
              }
            }}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
          />
          <span className="text-[12px] font-medium text-foreground">
            This item has variants
          </span>
        </label>
        <span className="text-[10px] text-muted-foreground">
          (e.g. Notebook 80 / 100 leaves, Pad Paper 1/2 / 1/4)
        </span>
      </div>

      {hasInlineVariants && (
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground">
            Each variant gets its own SKU and barcode. The parent item groups
            them together.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-border text-left text-[11px] text-muted-foreground">
                  <th className="min-w-[120px] pb-1.5 pr-2">Variant Name</th>
                  <th className="min-w-[100px] pb-1.5 pr-2">SKU *</th>
                  <th className="w-[100px] pb-1.5 pr-2">Sell Price</th>
                  {showCost && (
                    <th className="w-[100px] pb-1.5 pr-2">Cost Price</th>
                  )}
                  <th className="w-[32px] pb-1.5" />
                </tr>
              </thead>
              <tbody>
                {inlineVariants.map((variant) => (
                  <tr key={variant.id} className="border-b border-border/50">
                    <td className="py-1.5 pr-2">
                      <input
                        type="text"
                        value={variant.suffix}
                        onChange={(event) =>
                          onUpdateInlineVariant(
                            variant.id,
                            "suffix",
                            event.target.value,
                          )
                        }
                        placeholder="e.g. 80 leaves, 100 leaves, Blue"
                        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[12px] focus:border-primary focus:ring-1 focus:ring-primary/20"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="text"
                        value={variant.sku}
                        onChange={(event) =>
                          onUpdateInlineVariant(
                            variant.id,
                            "sku",
                            event.target.value,
                          )
                        }
                        placeholder="SKU"
                        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[12px] focus:border-primary focus:ring-1 focus:ring-primary/20"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="text"
                        value={variant.unitPrice}
                        onChange={(event) =>
                          onUpdateInlineVariant(
                            variant.id,
                            "unitPrice",
                            event.target.value,
                          )
                        }
                        placeholder="0.00"
                        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-right text-[12px] focus:border-primary focus:ring-1 focus:ring-primary/20"
                      />
                    </td>
                    {showCost && (
                      <td className="py-1.5 pr-2">
                        <input
                          type="text"
                          value={variant.costPrice}
                          onChange={(event) =>
                            onUpdateInlineVariant(
                              variant.id,
                              "costPrice",
                              event.target.value,
                            )
                          }
                          placeholder="0.00"
                          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-right text-[12px] focus:border-primary focus:ring-1 focus:ring-primary/20"
                        />
                      </td>
                    )}
                    <td className="py-1.5">
                      <button
                        type="button"
                        onClick={() => onRemoveInlineVariant(variant.id)}
                        className="rounded-md p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={onAddInlineVariant}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/10"
          >
            <Plus size={12} /> Add Variant
          </button>
        </div>
      )}
    </div>
  );
}
