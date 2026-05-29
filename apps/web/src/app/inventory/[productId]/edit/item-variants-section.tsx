"use client";

import { useMemo, useState, type ReactNode } from "react";
import { AlertCircle, Loader2, Plus, Trash2, X, Zap } from "lucide-react";
import { toast } from "sonner";

import { useConfirm } from "@/components/confirm-dialog";
import type { ProductDetail } from "@/hooks/use-products";
import {
  useAddOptionValue,
  useCreateOptionType,
  useDeleteOptionType,
  useDeleteOptionValue,
  useProductOptions,
  type OptionTypeRow,
} from "@/hooks/use-product-options";
import {
  useCreateVariantBatch,
  useDeleteVariant,
  useVariants,
  type VariantRow,
} from "@/hooks/use-variants";
import { cn } from "@/lib/utils";
import { getVariantDisplayName } from "../../lib/inventory-utils";

const inputClass =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary/40 focus:ring-2 focus:ring-primary/[0.08]";

type VariantEntry = {
  typeName: string;
  value: string;
  valueId: string;
};

type VariantCombination = {
  entries: VariantEntry[];
  key: string;
  labels: string[];
};

type Props = {
  locationId: string;
  product: ProductDetail;
  showCost: boolean;
  token: string;
};

function normalizeKeyPart(value: string) {
  return value.trim().toLowerCase();
}

function combinationKey(entries: Array<{ typeName: string; value: string }>) {
  return entries
    .map((entry) => `${normalizeKeyPart(entry.typeName)}=${normalizeKeyPart(entry.value)}`)
    .sort()
    .join("|");
}

function splitValues(value: string) {
  const seen = new Set<string>();
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => {
      if (!entry) return false;
      const key = normalizeKeyPart(entry);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function cartesianProduct<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) return [];
  return arrays.reduce<T[][]>(
    (acc, array) => acc.flatMap((combo) => array.map((value) => [...combo, value])),
    [[]],
  );
}

function skuPart(value: string) {
  return (
    value
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "")
      .slice(0, 5) || "VAR"
  );
}

function buildVariantSku(parentSku: string, labels: string[], usedSkus: Set<string>) {
  const base =
    parentSku
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24) || "ITEM";
  const suffix = labels.map(skuPart).join("-");
  let candidate = `${base}-${suffix}`.slice(0, 50).replace(/-+$/g, "");
  let counter = 2;

  while (usedSkus.has(candidate)) {
    const append = `-${counter}`;
    candidate = `${base}-${suffix}`.slice(0, 50 - append.length).replace(/-+$/g, "") + append;
    counter += 1;
  }

  usedSkus.add(candidate);
  return candidate;
}

function formatMoney(value: string | null | undefined) {
  const amount = Number(value ?? "0");
  if (!Number.isFinite(amount)) return "0.00";
  return amount.toFixed(2);
}

export function ItemVariantsSection({ locationId, product, showCost, token }: Props) {
  const confirm = useConfirm();
  const [showAddType, setShowAddType] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeValues, setNewTypeValues] = useState("");
  const [addingValueTypeId, setAddingValueTypeId] = useState<string | null>(null);
  const [newValue, setNewValue] = useState("");

  const optionsQuery = useProductOptions(token, locationId, product.id);
  const variantsQuery = useVariants(token, locationId, product.id);
  const createOptionType = useCreateOptionType(token, locationId);
  const addOptionValue = useAddOptionValue(token, locationId);
  const deleteOptionType = useDeleteOptionType(token, locationId);
  const deleteOptionValue = useDeleteOptionValue(token, locationId);
  const createVariantBatch = useCreateVariantBatch(token, locationId);
  const deleteVariant = useDeleteVariant(token, locationId);

  const optionTypes = optionsQuery.data?.data ?? [];
  const variants = (variantsQuery.data?.data ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));

  const combinations = useMemo<VariantCombination[]>(() => {
    if (optionTypes.length === 0 || optionTypes.some((type) => type.values.length === 0)) return [];
    const valueArrays = optionTypes.map((type) =>
      type.values.map((value) => ({
        typeName: type.name,
        value: value.value,
        valueId: value.id,
      })),
    );

    return cartesianProduct(valueArrays).map((entries) => ({
      entries,
      key: combinationKey(entries),
      labels: entries.map((entry) => entry.value),
    }));
  }, [optionTypes]);

  const existingVariantKeys = useMemo(() => {
    return new Set(
      variants
        .map((variant) => combinationKey(variant.options))
        .filter(Boolean),
    );
  }, [variants]);

  const missingCombinations = useMemo(
    () => combinations.filter((combo) => !existingVariantKeys.has(combo.key)),
    [combinations, existingVariantKeys],
  );

  const canGenerate = missingCombinations.length > 0 && missingCombinations.length <= 500;

  if (product.parentProductId) {
    return (
      <div className="rounded-lg border border-border bg-muted/20 px-3 py-4 text-[13px] text-muted-foreground">
        This item is already a variant. Edit option types and sibling variants from the parent item.
      </div>
    );
  }

  const saveOptionType = () => {
    const name = newTypeName.trim();
    const values = splitValues(newTypeValues);
    if (!name || values.length === 0) return;

    createOptionType.mutate(
      { productId: product.id, name, values },
      {
        onSuccess: () => {
          setNewTypeName("");
          setNewTypeValues("");
          setShowAddType(false);
          toast.success("Variant option saved");
        },
        onError: (err: any) => toast.error(err?.message || "Could not save variant option"),
      },
    );
  };

  const saveOptionValue = (typeId: string) => {
    const value = newValue.trim();
    if (!value) return;

    addOptionValue.mutate(
      { productId: product.id, typeId, value },
      {
        onSuccess: () => {
          setAddingValueTypeId(null);
          setNewValue("");
          toast.success("Variant value added");
        },
        onError: (err: any) => toast.error(err?.message || "Could not add variant value"),
      },
    );
  };

  const removeOptionType = async (type: OptionTypeRow) => {
    const ok = await confirm({
      title: "Delete Variant Option?",
      message: `Delete ${type.name} and its values? Existing variants using these values may also be affected.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    deleteOptionType.mutate(
      { productId: product.id, typeId: type.id },
      { onError: (err: any) => toast.error(err?.message || "Could not delete option") },
    );
  };

  const removeOptionValue = async (typeId: string, valueId: string, label: string) => {
    const ok = await confirm({
      title: "Delete Variant Value?",
      message: `Delete ${label}? Values already used by variants cannot be removed.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    deleteOptionValue.mutate(
      { productId: product.id, typeId, valueId },
      { onError: (err: any) => toast.error(err?.message || "Could not delete value") },
    );
  };

  const generateMissingVariants = () => {
    if (!canGenerate) return;
    const usedSkus = new Set([product.sku, ...variants.map((variant) => variant.sku)].filter(Boolean));
    const variantPayload = missingCombinations.map((combo) => ({
      name: combo.labels.join(" / "),
      sku: buildVariantSku(product.sku || product.mnemonicSku || "ITEM", combo.labels, usedSkus),
      unitPrice: formatMoney(product.unitPrice),
      costPrice: formatMoney(product.costPrice),
      optionValueIds: combo.entries.map((entry) => entry.valueId),
    }));

    createVariantBatch.mutate(
      { parentId: product.id, variants: variantPayload },
      {
        onSuccess: (_, vars) => toast.success(`Created ${vars.variants.length} variant${vars.variants.length === 1 ? "" : "s"}`),
        onError: (err: any) => toast.error(err?.message || "Could not create variants"),
      },
    );
  };

  const removeVariant = async (variant: VariantRow) => {
    const ok = await confirm({
      title: "Delete Variant?",
      message: `Delete ${variant.name || variant.sku}? This removes the variant item from inventory.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    deleteVariant.mutate(
      { parentId: product.id, variantId: variant.id },
      { onError: (err: any) => toast.error(err?.message || "Could not delete variant") },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-medium text-foreground">Custom option types</p>
          <p className="text-[12px] text-muted-foreground">Create options such as SIZE, COLOR, LENGTH, or any attribute you need.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddType(true)}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-[12px] font-medium text-primary transition-colors hover:bg-primary/[0.06]"
        >
          <Plus size={13} />
          Add Option
        </button>
      </div>

      {showAddType && (
        <div className="grid gap-2 rounded-lg border border-primary/20 bg-primary/[0.04] p-3 md:grid-cols-[0.8fr_1.4fr_auto_auto] md:items-end">
          <div>
            <VariantLabel>Name</VariantLabel>
            <input
              value={newTypeName}
              onChange={(event) => setNewTypeName(event.target.value)}
              placeholder="SIZE, COLOR, LENGTH"
              className={inputClass}
              autoFocus
            />
          </div>
          <div>
            <VariantLabel>Values</VariantLabel>
            <input
              value={newTypeValues}
              onChange={(event) => setNewTypeValues(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  saveOptionType();
                }
              }}
              placeholder="Small, Medium, Large"
              className={inputClass}
            />
          </div>
          <button
            type="button"
            disabled={!newTypeName.trim() || splitValues(newTypeValues).length === 0 || createOptionType.isPending}
            onClick={saveOptionType}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-[12px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createOptionType.isPending ? <Loader2 size={14} className="animate-spin" /> : "Save"}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowAddType(false);
              setNewTypeName("");
              setNewTypeValues("");
            }}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-3 text-[12px] font-medium text-foreground transition-colors hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      )}

      {optionsQuery.isLoading ? (
        <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-border text-[12px] text-muted-foreground">
          <Loader2 size={14} className="mr-2 animate-spin" />
          Loading variant options...
        </div>
      ) : optionTypes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-3 py-5 text-center text-[12px] text-muted-foreground">
          No variant options yet.
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {optionTypes.map((type) => (
            <div key={type.id} className="rounded-lg border border-border bg-muted/10 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] font-semibold text-foreground">{type.name}</p>
                <button
                  type="button"
                  onClick={() => removeOptionType(type)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Delete ${type.name}`}
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {type.values.map((value) => (
                  <span
                    key={value.id}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-[11px] font-medium text-foreground"
                  >
                    {value.value}
                    <button
                      type="button"
                      onClick={() => removeOptionValue(type.id, value.id, value.value)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Delete ${value.value}`}
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
              {addingValueTypeId === type.id ? (
                <div className="mt-3 flex gap-2">
                  <input
                    value={newValue}
                    onChange={(event) => setNewValue(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        saveOptionValue(type.id);
                      }
                      if (event.key === "Escape") {
                        setAddingValueTypeId(null);
                        setNewValue("");
                      }
                    }}
                    placeholder="New value"
                    className={cn(inputClass, "h-8")}
                    autoFocus
                  />
                  <button
                    type="button"
                    disabled={!newValue.trim() || addOptionValue.isPending}
                    onClick={() => saveOptionValue(type.id)}
                    className="rounded-md bg-primary px-3 text-[12px] font-medium text-primary-foreground disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setAddingValueTypeId(type.id);
                    setNewValue("");
                  }}
                  className="mt-3 inline-flex h-7 items-center gap-1 rounded-md px-2 text-[12px] font-medium text-primary transition-colors hover:bg-primary/[0.06]"
                >
                  <Plus size={12} />
                  Add Value
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-border pt-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-medium text-foreground">Generated variants</p>
            <p className="text-[12px] text-muted-foreground">
              {variants.length} existing, {missingCombinations.length} missing combination{missingCombinations.length === 1 ? "" : "s"}.
            </p>
          </div>
          <button
            type="button"
            disabled={!canGenerate || createVariantBatch.isPending}
            onClick={generateMissingVariants}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-[12px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createVariantBatch.isPending ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
            Generate Missing
          </button>
        </div>

        {missingCombinations.length > 500 && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
            <AlertCircle size={14} />
            Variant generation is limited to 500 combinations at a time.
          </div>
        )}

        {variantsQuery.isLoading ? (
          <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-border text-[12px] text-muted-foreground">
            <Loader2 size={14} className="mr-2 animate-spin" />
            Loading variants...
          </div>
        ) : variants.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-3 py-5 text-center text-[12px] text-muted-foreground">
            No variants created yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="grid min-w-[760px] grid-cols-[1.25fr_1.2fr_0.65fr_0.65fr_0.45fr_auto] gap-3 border-b border-border bg-muted/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              <div>Variant</div>
              <div>Options</div>
              <div className="text-right">Sell</div>
              {showCost && <div className="text-right">Cost</div>}
              {!showCost && <div />}
              <div className="text-right">Stock</div>
              <div />
            </div>
            <div className="min-w-[760px] divide-y divide-border">
              {variants.map((variant) => {
                const displayName = getVariantDisplayName(variant.name, variant.options, product.name) || variant.sku;
                return (
                  <div key={variant.id} className="grid grid-cols-[1.25fr_1.2fr_0.65fr_0.65fr_0.45fr_auto] items-center gap-3 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-foreground" title={variant.name}>
                        {displayName}
                      </p>
                      <p className="truncate font-mono text-[11px] text-muted-foreground">{variant.sku}</p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {variant.options.length > 0 ? (
                        variant.options.map((option) => (
                          <span
                            key={`${variant.id}-${option.typeName}-${option.value}`}
                            className="rounded-full bg-primary/[0.07] px-2 py-0.5 text-[11px] font-medium text-primary"
                          >
                            {option.typeName}: {option.value}
                          </span>
                        ))
                      ) : (
                        <span className="text-[12px] text-muted-foreground">No options</span>
                      )}
                    </div>
                    <div className="text-right text-[12px] font-medium tabular-nums text-foreground">
                      {formatMoney(variant.unitPrice)}
                    </div>
                    {showCost ? (
                      <div className="text-right text-[12px] tabular-nums text-muted-foreground">
                        {formatMoney(variant.costPrice)}
                      </div>
                    ) : (
                      <div />
                    )}
                    <div className="text-right text-[12px] tabular-nums text-foreground">
                      {variant.stockLevel.toLocaleString()}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeVariant(variant)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Delete ${displayName || variant.sku}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function VariantLabel({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1 block text-[12px] font-medium text-muted-foreground">
      {children}
    </label>
  );
}
