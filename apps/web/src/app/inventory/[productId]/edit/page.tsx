"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Barcode,
  Check,
  DollarSign,
  Loader2,
  Package,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

import { useAuth } from "@/app/auth-context";
import { useSidebar } from "@/app/sidebar-context";
import { SelectWithQuickAdd } from "@/components/select-with-quick-add";
import { useBrands, useCreateBrand } from "@/hooks/use-brands";
import { useCategories, useCreateCategory } from "@/hooks/use-categories";
import { useProductDetail, useUpdateProduct } from "@/hooks/use-products";
import { cn } from "@/lib/utils";

import { generateEan13Barcode } from "../../lib/identifier-generators";
import { makeSlug } from "../../new/form-helpers";

const fieldClass =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary/40 focus:ring-2 focus:ring-primary/[0.08]";

const packagingUnits = ["", "box", "case", "pack", "carton", "set", "bag", "bundle"];
const purchaseUnits = ["", "piece", "box", "case", "pack", "carton", "bag", "bundle"];
const sellingUnits = ["piece", "each", "pair", "set", "box", "case", "pack"];

export default function EditInventoryItemPage() {
  const params = useParams<{ productId: string }>();
  const productId = params?.productId ?? null;
  const router = useRouter();
  const { token, locationId, user } = useAuth();
  const { isCollapsed } = useSidebar();
  const showCost = ["ADMIN", "MANAGER"].includes(user?.role ?? "");

  const productQuery = useProductDetail(token, locationId, productId);
  const updateProduct = useUpdateProduct(token, locationId);
  const categoriesQuery = useCategories(token, locationId, { activeOnly: true });
  const brandsQuery = useBrands(token, locationId);
  const createCategory = useCreateCategory(token, locationId);
  const createBrand = useCreateBrand(token, locationId);

  const product = productQuery.data;
  const categories = categoriesQuery.data?.data ?? [];
  const brands = brandsQuery.data?.data ?? [];

  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [description, setDescription] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [barcode, setBarcode] = useState("");
  const [reorderPoint, setReorderPoint] = useState("5");
  const [unitsPerCase, setUnitsPerCase] = useState("1");
  const [packagingUnit, setPackagingUnit] = useState("");
  const [sellingUnit, setSellingUnit] = useState("piece");
  const [purchaseUnit, setPurchaseUnit] = useState("");
  const [conversionFactor, setConversionFactor] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!product || product.id === loadedId) return;
    setLoadedId(product.id);
    setName(product.name ?? "");
    setCategoryId(product.categoryId ?? "");
    setBrandId(product.brandId ?? "");
    setDescription(product.description ?? "");
    setUnitPrice(product.unitPrice ?? "0.00");
    setCostPrice(product.costPrice ?? "0.00");
    setBarcode(product.barcode ?? "");
    setReorderPoint(String(product.reorderPoint ?? 5));
    setUnitsPerCase(String(product.unitsPerCase ?? 1));
    setPackagingUnit(product.packagingUnit ?? "");
    setSellingUnit(product.sellingUnit ?? "piece");
    setPurchaseUnit(product.purchaseUnit ?? "");
    setConversionFactor(String(product.conversionFactor ?? 1));
  }, [loadedId, product]);

  const margin = useMemo(() => {
    const sell = parseFloat(unitPrice) || 0;
    const cost = parseFloat(costPrice) || 0;
    if (sell <= 0) return null;
    return (((sell - cost) / sell) * 100).toFixed(1);
  }, [unitPrice, costPrice]);

  const isValid = name.trim() !== "";
  const isSaving = updateProduct.isPending;

  const quickAddCategory = async (value: string) => {
    const res: any = await createCategory.mutateAsync({ name: value, slug: makeSlug(value) });
    return { id: res?.data?.id ?? res?.id ?? "" };
  };

  const quickAddBrand = async (value: string) => {
    const res: any = await createBrand.mutateAsync({ name: value, slug: makeSlug(value) });
    return { id: res?.data?.id ?? res?.id ?? "" };
  };

  const handleSave = async () => {
    if (!productId || !isValid) return;
    setError(null);
    setSaved(false);

    try {
      await updateProduct.mutateAsync({
        id: productId,
        name: name.trim(),
        unitPrice: unitPrice || "0.00",
        ...(showCost ? { costPrice: costPrice || "0.00" } : {}),
        ...(barcode.trim() ? { barcode: barcode.trim() } : {}),
        categoryId: categoryId || null,
        brandId: brandId || null,
        description: description.trim() || null,
        reorderPoint: parseInt(reorderPoint, 10) || 0,
        unitsPerCase: Math.max(1, parseInt(unitsPerCase, 10) || 1),
        packagingUnit: packagingUnit || null,
        sellingUnit: sellingUnit || "piece",
        purchaseUnit: purchaseUnit || null,
        conversionFactor: purchaseUnit ? parseFloat(conversionFactor) || 1 : 1,
      });
      setSaved(true);
    } catch (err: any) {
      setError(err?.message || "Failed to save item setup");
    }
  };

  if (productQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <Loader2 size={18} className="mr-2 animate-spin" />
        Loading item setup...
      </div>
    );
  }

  if (productQuery.isError || !product) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">
        Item setup could not be loaded.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/inventory")}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Edit Item Setup</h2>
            <p className="text-[12px] text-muted-foreground">
              Complete catalog, pricing, barcode, and inventory settings
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-[12px] text-destructive">
          <AlertCircle size={14} />
          {error}
        </div>
      )}
      {saved && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-success/20 bg-success/5 px-3 py-2 text-[12px] text-success">
          <Check size={14} />
          Item setup saved.
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto pb-20">
        <SetupSection icon={Package} title="Basic Information">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <div className="col-span-2">
              <FieldLabel required>Item Name</FieldLabel>
              <input className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div>
              <FieldLabel>SKU</FieldLabel>
              <div className={cn(fieldClass, "flex items-center bg-muted/40 font-mono text-muted-foreground")}>
                {product.sku}
              </div>
            </div>
            <SelectWithQuickAdd
              label="Category"
              value={categoryId}
              onChange={setCategoryId}
              options={categories}
              placeholder="Select category..."
              labelClassName="text-[12px] font-medium text-muted-foreground"
              onQuickAdd={quickAddCategory}
            />
            <SelectWithQuickAdd
              label="Brand"
              value={brandId}
              onChange={setBrandId}
              options={brands}
              placeholder="No Brand"
              labelClassName="text-[12px] font-medium text-muted-foreground"
              onQuickAdd={quickAddBrand}
            />
            <div className="col-span-2">
              <FieldLabel>Description / Notes</FieldLabel>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                placeholder="Internal notes, pack size, color, shelf location, or supplier details..."
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary/40 focus:ring-2 focus:ring-primary/[0.08]"
              />
            </div>
          </div>
        </SetupSection>

        <SetupSection icon={DollarSign} title="Pricing">
          <div className={cn("grid gap-x-4 gap-y-3", showCost ? "grid-cols-3" : "grid-cols-1")}>
            <CurrencyField label="Sell Price" value={unitPrice} onChange={setUnitPrice} />
            {showCost && (
              <>
                <CurrencyField label="Cost Price" value={costPrice} onChange={setCostPrice} />
                <div>
                  <FieldLabel>Margin</FieldLabel>
                  <div className="flex h-9 items-center rounded-lg border border-border bg-muted/40 px-3 text-[13px]">
                    {margin !== null ? <span className="font-medium text-foreground">{margin}%</span> : <span className="text-muted-foreground">-</span>}
                  </div>
                </div>
              </>
            )}
          </div>
        </SetupSection>

        <SetupSection icon={Warehouse} title="Inventory Setup">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 lg:grid-cols-4">
            <div className="col-span-2">
              <div className="mb-1 flex items-center justify-between gap-2">
                <FieldLabel>Barcode</FieldLabel>
                <button
                  type="button"
                  onClick={() => setBarcode(generateEan13Barcode())}
                  className="inline-flex h-6 items-center gap-1 rounded-md border border-border bg-background px-2 text-[11px] font-medium text-primary transition-colors hover:bg-primary/[0.06]"
                >
                  <Barcode size={12} />
                  Generate EAN-13
                </button>
              </div>
              <input
                className={cn(fieldClass, "font-mono")}
                value={barcode}
                maxLength={50}
                onChange={(event) => setBarcode(event.target.value.slice(0, 50))}
                placeholder="Scan barcode or leave blank"
              />
            </div>
            <NumberField label="Reorder Point" value={reorderPoint} onChange={setReorderPoint} />
            <NumberField label="Units per Case" value={unitsPerCase} onChange={setUnitsPerCase} min={1} />
            <SelectField label="Selling Unit" value={sellingUnit} onChange={setSellingUnit} options={sellingUnits} />
            <SelectField label="Packaging Unit" value={packagingUnit} onChange={setPackagingUnit} options={packagingUnits} emptyLabel="None" />
            <SelectField label="Purchase Unit" value={purchaseUnit} onChange={setPurchaseUnit} options={purchaseUnits} emptyLabel="Same as selling unit" />
            <NumberField
              label="Conversion Factor"
              value={conversionFactor}
              onChange={setConversionFactor}
              min={1}
              disabled={!purchaseUnit}
            />
          </div>
        </SetupSection>
      </div>

      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 px-6 py-3 backdrop-blur-sm transition-[left] duration-200",
          isCollapsed ? "md:left-16" : "md:left-[252px]",
        )}
      >
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/inventory")}
            className="rounded-lg border border-border bg-background px-4 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid || isSaving}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-[13px] font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {isSaving ? "Saving..." : "Save Setup"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SetupSection({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-background shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted">
          <Icon size={14} className="text-muted-foreground" />
        </div>
        <span className="text-[13px] font-semibold text-foreground">{title}</span>
      </div>
      <div className="px-4 pb-4 pt-3">{children}</div>
    </section>
  );
}

function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="mb-1 block text-[12px] font-medium text-muted-foreground">
      {children}
      {required && <span className="text-destructive"> *</span>}
    </label>
  );
}

function CurrencyField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input
        type="number"
        step="0.01"
        min="0"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass}
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min = 0,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: number;
  disabled?: boolean;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input
        type="number"
        min={min}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={cn(fieldClass, disabled && "opacity-50")}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  emptyLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  emptyLabel?: string;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <select value={value} onChange={(event) => onChange(event.target.value)} className={fieldClass}>
        {options.map((option) => (
          <option key={option || "empty"} value={option}>
            {option ? option : emptyLabel ?? "None"}
          </option>
        ))}
      </select>
    </div>
  );
}
