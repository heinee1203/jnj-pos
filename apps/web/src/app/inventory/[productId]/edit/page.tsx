"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Barcode,
  Check,
  DollarSign,
  HelpCircle,
  LockKeyhole,
  Loader2,
  MapPin,
  Package,
  Plus,
  Trash2,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

import { useAuth } from "@/app/auth-context";
import { useSidebar } from "@/app/sidebar-context";
import { useConfirm } from "@/components/confirm-dialog";
import { SelectWithQuickAdd } from "@/components/select-with-quick-add";
import { useBrands, useCreateBrand } from "@/hooks/use-brands";
import { useCategories, useCreateCategory } from "@/hooks/use-categories";
import { useProductLocations, type ProductLocationRow } from "@/hooks/use-product-locations";
import { useProductDetail, useUpdateProduct, type ProductPriceTier } from "@/hooks/use-products";
import { cn } from "@/lib/utils";

import { generateEan13Barcode } from "../../lib/identifier-generators";
import { makeSlug } from "../../new/form-helpers";

const fieldClass =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary/40 focus:ring-2 focus:ring-primary/[0.08]";

const CONVERSION_FACTOR_HELP =
  "How many Selling Units are inside 1 Purchase Unit. Example: if Selling Unit is PIECE and Purchase Unit is CASE with 80 pieces, enter 80.";
const DEFAULT_SELLING_UNIT = "PIECE";
const packagingUnits = ["", "BOX", "CASE", "PACK", "CARTON", "SET", "BAG", "BUNDLE"];
const purchaseUnits = ["", "PIECE", "BOX", "CASE", "PACK", "CARTON", "BAG", "BUNDLE"];
const sellingUnits = ["PIECE", "EACH", "PAIR", "SET", "BOX", "CASE", "PACK"];

type UnitPriceTierDraft = {
  localId: string;
  id?: string;
  label: string;
  quantity: string;
  price: string;
};

type DisplayUnitOption = {
  key: string;
  label: string;
  quantity: number;
};

function makeLocalId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

function normalizeUom(value: string | null | undefined, fallback = "") {
  const normalized = value?.trim().toUpperCase() ?? "";
  return normalized || fallback;
}

function createTierDraft(
  tier?: ProductPriceTier,
  fallback?: { label: string; quantity: number; price: string },
): UnitPriceTierDraft {
  return {
    localId: tier?.id ?? makeLocalId(),
    id: tier?.id,
    label: normalizeUom(tier?.label ?? fallback?.label),
    quantity: String(tier?.quantity ?? fallback?.quantity ?? ""),
    price: tier?.price ?? fallback?.price ?? "",
  };
}

function isMoney(value: string) {
  return /^\d+(\.\d{1,2})?$/.test(value);
}

function unitKey(label: string, quantity: number) {
  return `${label.trim().toLowerCase()}::${quantity}`;
}

function addDisplayUnitOption(
  options: DisplayUnitOption[],
  label: string | null | undefined,
  quantity: number,
) {
  const normalizedLabel = normalizeUom(label);
  const normalizedQty = Math.max(1, Math.floor(quantity || 1));
  if (!normalizedLabel) return;

  const key = unitKey(normalizedLabel, normalizedQty);
  if (options.some((option) => option.key === key)) return;
  options.push({ key, label: normalizedLabel, quantity: normalizedQty });
}

function getLocationDefaultUnitKey(
  row: ProductLocationRow,
  options: DisplayUnitOption[],
  preferred: {
    baseUnit: string;
    purchaseUnit: string;
    packagingUnit: string;
    unitsPerCase: number;
  },
) {
  const base =
    options.find((option) => option.quantity === 1) ??
    options[0];
  if (!base) return "";

  if (["WAREHOUSE", "TRANSIT_BUFFER"].includes(row.locationType)) {
    const purchaseMatch = options.find(
      (option) =>
        preferred.purchaseUnit &&
        option.label.toLowerCase() === preferred.purchaseUnit.toLowerCase(),
    );
    if (purchaseMatch && purchaseMatch.quantity > 1) return purchaseMatch.key;

    const packageMatch = options.find(
      (option) =>
        preferred.packagingUnit &&
        option.label.toLowerCase() === preferred.packagingUnit.toLowerCase(),
    );
    if (packageMatch && packageMatch.quantity > 1) return packageMatch.key;

    const caseMatch = options.find((option) => option.quantity === preferred.unitsPerCase);
    if (caseMatch && caseMatch.quantity > 1) return caseMatch.key;

    const largest = [...options].sort((a, b) => b.quantity - a.quantity)[0];
    if (largest && largest.quantity > 1) return largest.key;
  }

  const explicitSellingUnit = options.find(
    (option) => option.label.toLowerCase() === preferred.baseUnit.toLowerCase(),
  );
  return explicitSellingUnit?.key ?? base.key;
}

function formatUnitQuantity(stockLevel: number, unit: DisplayUnitOption | undefined, baseUnit: string) {
  const quantity = Math.max(1, unit?.quantity ?? 1);
  const label = unit?.label ?? baseUnit;
  const stock = Math.max(0, Math.floor(stockLevel || 0));

  if (quantity <= 1) {
    return `${stock.toLocaleString()} ${label}`;
  }

  const whole = Math.floor(stock / quantity);
  const remainder = stock % quantity;
  if (remainder === 0) {
    return `${whole.toLocaleString()} ${label}`;
  }
  return `${whole.toLocaleString()} ${label} + ${remainder.toLocaleString()} ${baseUnit}`;
}

export default function EditInventoryItemPage() {
  const params = useParams<{ productId: string }>();
  const productId = params?.productId ?? null;
  const router = useRouter();
  const { token, locationId, user } = useAuth();
  const { isCollapsed } = useSidebar();
  const confirm = useConfirm();
  const showCost = ["ADMIN", "MANAGER"].includes(user?.role ?? "");

  const productQuery = useProductDetail(token, locationId, productId);
  const locationsQuery = useProductLocations(token, locationId, productId);
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
  const [costPriceUnlocked, setCostPriceUnlocked] = useState(false);
  const [priceTiers, setPriceTiers] = useState<UnitPriceTierDraft[]>([]);
  const [barcode, setBarcode] = useState("");
  const [reorderPoint, setReorderPoint] = useState("5");
  const [unitsPerCase, setUnitsPerCase] = useState("1");
  const [packagingUnit, setPackagingUnit] = useState("");
  const [sellingUnit, setSellingUnit] = useState(DEFAULT_SELLING_UNIT);
  const [purchaseUnit, setPurchaseUnit] = useState("");
  const [conversionFactor, setConversionFactor] = useState("1");
  const [locationUnitOverrides, setLocationUnitOverrides] = useState<Record<string, string>>({});
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
    setCostPriceUnlocked(false);
    setPriceTiers(
      product.priceTiers?.length
        ? product.priceTiers.map((tier) => createTierDraft(tier))
        : [
            createTierDraft(undefined, {
              label: normalizeUom(product.sellingUnit, DEFAULT_SELLING_UNIT),
              quantity: 1,
              price: product.unitPrice ?? "0.00",
            }),
          ],
    );
    setBarcode(product.barcode ?? "");
    setReorderPoint(String(product.reorderPoint ?? 5));
    setUnitsPerCase(String(product.unitsPerCase ?? 1));
    setPackagingUnit(normalizeUom(product.packagingUnit));
    setSellingUnit(normalizeUom(product.sellingUnit, DEFAULT_SELLING_UNIT));
    setPurchaseUnit(normalizeUom(product.purchaseUnit));
    setConversionFactor(String(product.conversionFactor ?? 1));
    setLocationUnitOverrides({});
  }, [loadedId, product]);

  const displayUnitOptions = useMemo(() => {
    const options: DisplayUnitOption[] = [];
    const baseUnit = normalizeUom(sellingUnit, DEFAULT_SELLING_UNIT);
    const caseQty = Math.max(1, parseInt(unitsPerCase, 10) || 1);
    const purchaseQty = Math.max(1, Math.floor(parseFloat(conversionFactor) || 1));

    addDisplayUnitOption(options, baseUnit, 1);
    for (const tier of priceTiers) {
      const quantity = parseInt(tier.quantity, 10);
      if (Number.isInteger(quantity) && quantity > 0) {
        addDisplayUnitOption(options, tier.label, quantity);
      }
    }
    if (caseQty > 1) {
      addDisplayUnitOption(options, packagingUnit || "CASE", caseQty);
    }
    if (purchaseUnit && purchaseQty > 1) {
      addDisplayUnitOption(options, purchaseUnit, purchaseQty);
    }

    return options.sort((a, b) => a.quantity - b.quantity || a.label.localeCompare(b.label));
  }, [conversionFactor, packagingUnit, priceTiers, purchaseUnit, sellingUnit, unitsPerCase]);

  const locationRows = locationsQuery.data?.data ?? [];
  const locationDisplayDefaults = useMemo(() => {
    const defaults: Record<string, string> = {};
    const preferred = {
      baseUnit: normalizeUom(sellingUnit, DEFAULT_SELLING_UNIT),
      purchaseUnit,
      packagingUnit,
      unitsPerCase: Math.max(1, parseInt(unitsPerCase, 10) || 1),
    };

    for (const row of locationRows) {
      defaults[row.locationId] = getLocationDefaultUnitKey(row, displayUnitOptions, preferred);
    }
    return defaults;
  }, [displayUnitOptions, locationRows, packagingUnit, purchaseUnit, sellingUnit, unitsPerCase]);

  const displayUnitByKey = useMemo(
    () => new Map(displayUnitOptions.map((option) => [option.key, option])),
    [displayUnitOptions],
  );

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

  const updatePriceTier = (
    localId: string,
    field: keyof Omit<UnitPriceTierDraft, "localId" | "id">,
    value: string,
  ) => {
    setPriceTiers((prev) =>
      prev.map((tier) =>
        tier.localId === localId
          ? { ...tier, [field]: field === "label" ? normalizeUom(value) : value }
          : tier,
      ),
    );
  };

  const addPriceTier = (label = "", quantity = "") => {
    setPriceTiers((prev) => {
      const normalizedLabel = normalizeUom(label);
      const normalizedQuantity =
        quantity && prev.some((tier) => tier.quantity === quantity) ? "" : quantity;

      if (
        normalizedLabel &&
        prev.some(
          (tier) =>
            normalizeUom(tier.label) === normalizedLabel &&
            (!normalizedQuantity || tier.quantity === normalizedQuantity),
        )
      ) {
        return prev;
      }

      return [
        ...prev,
        {
          localId: makeLocalId(),
          label: normalizedLabel,
          quantity: normalizedQuantity,
          price: "",
        },
      ];
    });
  };

  const removePriceTier = (localId: string) => {
    setPriceTiers((prev) => prev.filter((tier) => tier.localId !== localId));
  };

  const unlockCostPrice = async () => {
    if (costPriceUnlocked) return;
    const confirmed = await confirm({
      title: "Edit Cost Price?",
      message: "Cost price affects margins, valuation, and reports. Unlock it only if you are sure the saved cost is wrong.",
      confirmLabel: "Unlock Cost Price",
      cancelLabel: "Keep Locked",
      variant: "warning",
    });
    if (confirmed) setCostPriceUnlocked(true);
  };

  const normalizePriceTiers = (): ProductPriceTier[] | null => {
    const rows = priceTiers
      .map((tier) => ({
        id: tier.id,
        label: normalizeUom(tier.label),
        quantity: parseInt(tier.quantity, 10),
        price: tier.price.trim(),
      }))
      .filter((tier) => tier.label || tier.quantity || tier.price);

    for (const tier of rows) {
      if (!tier.label) {
        setError("Enter a unit name for each unit price.");
        return null;
      }
      if (!Number.isInteger(tier.quantity) || tier.quantity < 1) {
        setError(`Enter a valid quantity for ${tier.label}.`);
        return null;
      }
      if (!isMoney(tier.price)) {
        setError(`Enter a valid price for ${tier.label}.`);
        return null;
      }
    }

    const uniqueQuantities = new Set(rows.map((tier) => tier.quantity));
    if (uniqueQuantities.size !== rows.length) {
      setError("Each unit price must use a different quantity.");
      return null;
    }

    return rows;
  };

  const handleSave = async () => {
    if (!productId || !isValid) return;
    setError(null);
    setSaved(false);

    try {
      const normalizedPriceTiers = normalizePriceTiers();
      if (!normalizedPriceTiers) return;

      const baseUnitPrice =
        normalizedPriceTiers.find((tier) => tier.quantity === 1)?.price ||
        unitPrice ||
        "0.00";

      await updateProduct.mutateAsync({
        id: productId,
        name: name.trim(),
        unitPrice: baseUnitPrice,
        ...(showCost ? { costPrice: costPrice || "0.00" } : {}),
        ...(barcode.trim() ? { barcode: barcode.trim() } : {}),
        categoryId: categoryId || null,
        brandId: brandId || null,
        description: description.trim() || null,
        reorderPoint: parseInt(reorderPoint, 10) || 0,
        unitsPerCase: Math.max(1, parseInt(unitsPerCase, 10) || 1),
        packagingUnit: normalizeUom(packagingUnit) || null,
        sellingUnit: normalizeUom(sellingUnit, DEFAULT_SELLING_UNIT),
        purchaseUnit: normalizeUom(purchaseUnit) || null,
        conversionFactor: purchaseUnit ? parseFloat(conversionFactor) || 1 : 1,
        priceTiers: normalizedPriceTiers,
      });
      setUnitPrice(baseUnitPrice);
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
                <CurrencyField
                  label="Cost Price"
                  value={costPrice}
                  onChange={setCostPrice}
                  locked={!costPriceUnlocked}
                  onUnlock={unlockCostPrice}
                />
                <div>
                  <FieldLabel>Margin</FieldLabel>
                  <div className="flex h-9 items-center rounded-lg border border-border bg-muted/40 px-3 text-[13px]">
                    {margin !== null ? <span className="font-medium text-foreground">{margin}%</span> : <span className="text-muted-foreground">-</span>}
                  </div>
                </div>
              </>
            )}
          </div>
          <UnitPriceTiersEditor
            tiers={priceTiers}
            baseSellingUnit={sellingUnit}
            unitsPerCase={unitsPerCase}
            onAdd={addPriceTier}
            onRemove={removePriceTier}
            onUpdate={updatePriceTier}
          />
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
              tooltip={CONVERSION_FACTOR_HELP}
              value={conversionFactor}
              onChange={setConversionFactor}
              min={1}
              disabled={!purchaseUnit}
            />
          </div>
        </SetupSection>

        <SetupSection icon={MapPin} title="Inventory by Location">
          <LocationInventoryTable
            baseUnit={normalizeUom(sellingUnit, DEFAULT_SELLING_UNIT)}
            displayUnitByKey={displayUnitByKey}
            displayUnitOptions={displayUnitOptions}
            isLoading={locationsQuery.isLoading}
            locationDisplayDefaults={locationDisplayDefaults}
            locationUnitOverrides={locationUnitOverrides}
            rows={locationRows}
            onDisplayUnitChange={(locationId, key) =>
              setLocationUnitOverrides((prev) => ({ ...prev, [locationId]: key }))
            }
          />
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

function UnitPriceTiersEditor({
  tiers,
  baseSellingUnit,
  unitsPerCase,
  onAdd,
  onRemove,
  onUpdate,
}: {
  tiers: UnitPriceTierDraft[];
  baseSellingUnit: string;
  unitsPerCase: string;
  onAdd: (label?: string, quantity?: string) => void;
  onRemove: (localId: string) => void;
  onUpdate: (
    localId: string,
    field: keyof Omit<UnitPriceTierDraft, "localId" | "id">,
    value: string,
  ) => void;
}) {
  const baseUnitLabel = normalizeUom(baseSellingUnit, DEFAULT_SELLING_UNIT);
  const caseQty = Math.max(1, parseInt(unitsPerCase, 10) || 1);
  const presetButtons = [
    { label: baseUnitLabel, quantity: "1" },
    { label: "DOZEN", quantity: "12" },
    { label: "CASE", quantity: String(caseQty) },
  ];

  return (
    <div className="mt-4 border-t border-border pt-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <FieldLabel>Unit Prices</FieldLabel>
        <div className="flex flex-wrap items-center gap-1.5">
          {presetButtons.map((preset) => (
            <button
              key={`${preset.label}-${preset.quantity}`}
              type="button"
              onClick={() => onAdd(preset.label, preset.quantity)}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2 text-[11px] font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Plus size={12} />
              {preset.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onAdd()}
            className="inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2 text-[11px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus size={12} />
            Custom
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {tiers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-[12px] text-muted-foreground">
            Add at least one unit price.
          </div>
        ) : (
          tiers.map((tier) => {
            const quantity = parseInt(tier.quantity, 10) || 0;
            const price = parseFloat(tier.price) || 0;
            const equivalent = quantity > 1 && price > 0 ? (price / quantity).toFixed(2) : null;

            return (
              <div key={tier.localId} className="grid grid-cols-[1.1fr_0.8fr_1fr_auto] items-end gap-2">
                <div>
                  <FieldLabel>Unit</FieldLabel>
                  <input
                    value={tier.label}
                    onChange={(event) => onUpdate(tier.localId, "label", event.target.value.slice(0, 50))}
                    placeholder="PIECE, DOZEN, CASE..."
                    className={fieldClass}
                  />
                </div>
                <div>
                  <FieldLabel>Qty in {baseUnitLabel}</FieldLabel>
                  <input
                    type="number"
                    min="1"
                    value={tier.quantity}
                    onChange={(event) => onUpdate(tier.localId, "quantity", event.target.value)}
                    className={fieldClass}
                  />
                </div>
                <div>
                  <FieldLabel>Price</FieldLabel>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={tier.price}
                    onChange={(event) => onUpdate(tier.localId, "price", event.target.value)}
                    placeholder="0.00"
                    className={fieldClass}
                  />
                  {equivalent && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {equivalent} per {baseUnitLabel}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(tier.localId)}
                  className="mb-0.5 flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Remove ${tier.label || "unit price"}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function LocationInventoryTable({
  baseUnit,
  displayUnitByKey,
  displayUnitOptions,
  isLoading,
  locationDisplayDefaults,
  locationUnitOverrides,
  rows,
  onDisplayUnitChange,
}: {
  baseUnit: string;
  displayUnitByKey: Map<string, DisplayUnitOption>;
  displayUnitOptions: DisplayUnitOption[];
  isLoading: boolean;
  locationDisplayDefaults: Record<string, string>;
  locationUnitOverrides: Record<string, string>;
  rows: ProductLocationRow[];
  onDisplayUnitChange: (locationId: string, key: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex h-24 items-center justify-center text-[12px] text-muted-foreground">
        <Loader2 size={14} className="mr-2 animate-spin" />
        Loading location inventory...
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-[12px] text-muted-foreground">
        No active locations found.
      </div>
    );
  }

  const gridClass = "grid min-w-[860px] grid-cols-[1.35fr_1.05fr_1fr_0.9fr_1fr_0.9fr] gap-3";

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <div className={cn(gridClass, "border-b border-border bg-muted/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground")}>
        <div>Location</div>
        <div>Display UOM</div>
        <div className="text-right">On Hand</div>
        <div className="text-right">Reserved</div>
        <div className="text-right">Available</div>
        <div className="text-right">Reorder</div>
      </div>
      <div className="min-w-[860px] divide-y divide-border">
        {rows.map((row) => {
          const selectedKey =
            locationUnitOverrides[row.locationId] ||
            locationDisplayDefaults[row.locationId] ||
            displayUnitOptions[0]?.key ||
            "";
          const unit = displayUnitByKey.get(selectedKey) ?? displayUnitOptions[0];
          const available = Math.max(0, row.stockLevel - row.reservedLevel);

          return (
            <div key={row.locationId} className={cn(gridClass, "items-center px-3 py-2.5")}>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-foreground">{row.locationName}</p>
                <p className="text-[11px] text-muted-foreground">{row.locationType.replace(/_/g, " ")}</p>
              </div>
              <select
                value={selectedKey}
                onChange={(event) => onDisplayUnitChange(row.locationId, event.target.value)}
                className="h-8 rounded-md border border-border bg-background px-2 text-[12px] text-foreground outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/[0.08]"
              >
                {displayUnitOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.quantity > 1 ? `${option.label} (${option.quantity} ${baseUnit})` : option.label}
                  </option>
                ))}
              </select>
              <div className="text-right">
                <p className="text-[13px] font-semibold tabular-nums text-foreground">
                  {formatUnitQuantity(row.stockLevel, unit, baseUnit)}
                </p>
                {unit?.quantity && unit.quantity > 1 && (
                  <p className="text-[11px] text-muted-foreground">
                    {row.stockLevel.toLocaleString()} {baseUnit}
                  </p>
                )}
              </div>
              <div className="text-right text-[12px] tabular-nums text-muted-foreground">
                {formatUnitQuantity(row.reservedLevel, unit, baseUnit)}
              </div>
              <div className="text-right">
                <p className="text-[12px] font-medium tabular-nums text-foreground">
                  {formatUnitQuantity(available, unit, baseUnit)}
                </p>
                {!row.availableForSale && (
                  <p className="text-[10px] font-medium text-muted-foreground">Not for sale</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-[12px] tabular-nums text-muted-foreground">
                  {formatUnitQuantity(row.reorderPoint, unit, baseUnit)}
                </p>
                <p className={cn(
                  "text-[10px] font-medium",
                  available <= row.reorderPoint ? "text-amber-600" : "text-muted-foreground",
                )}>
                  {available <= row.reorderPoint ? "Below reorder" : "Available"}
                </p>
              </div>
            </div>
          );
        })}
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
  locked = false,
  onUnlock,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  locked?: boolean;
  onUnlock?: () => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label className="text-[12px] font-medium text-muted-foreground">{label}</label>
        {locked && (
          <button
            type="button"
            onClick={onUnlock}
            className="inline-flex h-6 items-center gap-1 rounded-md border border-border bg-background px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/[0.06] hover:text-primary"
          >
            <LockKeyhole size={11} />
            Unlock
          </button>
        )}
      </div>
      <input
        type="number"
        step="0.01"
        min="0"
        value={value}
        readOnly={locked}
        aria-readonly={locked}
        onFocus={(event) => {
          if (!locked) return;
          event.currentTarget.blur();
          onUnlock?.();
        }}
        onChange={(event) => {
          if (!locked) onChange(event.target.value);
        }}
        className={cn(fieldClass, locked && "cursor-not-allowed bg-muted/40 text-muted-foreground")}
      />
    </div>
  );
}

function NumberField({
  label,
  tooltip,
  value,
  onChange,
  min = 0,
  disabled,
}: {
  label: string;
  tooltip?: string;
  value: string;
  onChange: (value: string) => void;
  min?: number;
  disabled?: boolean;
}) {
  return (
    <div>
      {tooltip ? (
        <div className="mb-1 flex items-center gap-1.5">
          <label className="text-[12px] font-medium text-muted-foreground">{label}</label>
          <span
            tabIndex={0}
            aria-label={`${label}: ${tooltip}`}
            className="group relative inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-primary focus:text-primary focus:outline-none"
          >
            <HelpCircle size={13} />
            <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-72 -translate-x-1/2 rounded-md border border-border bg-popover px-3 py-2 text-left text-xs font-normal leading-relaxed text-popover-foreground shadow-lg group-hover:block group-focus:block">
              {tooltip}
            </span>
          </span>
        </div>
      ) : (
        <FieldLabel>{label}</FieldLabel>
      )}
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
  const normalizedValue = normalizeUom(value);
  const normalizedOptions =
    normalizedValue && !options.includes(normalizedValue)
      ? [...options, normalizedValue]
      : options;

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <select
        value={normalizedValue}
        onChange={(event) => onChange(normalizeUom(event.target.value))}
        className={fieldClass}
      >
        {normalizedOptions.map((option) => (
          <option key={option || "empty"} value={option}>
            {option ? option : emptyLabel ?? "None"}
          </option>
        ))}
      </select>
    </div>
  );
}
