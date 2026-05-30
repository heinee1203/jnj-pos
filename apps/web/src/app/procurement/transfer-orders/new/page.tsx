"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, PackagePlus, Plus, Search, Trash2 } from "lucide-react";
import { useAuth } from "@/app/auth-context";
import { apiFetch } from "@/lib/api";
import { getProductDisplayName } from "@/lib/format";
import { useLocations } from "@/hooks/use-locations";
import { usePurchaseOrderProductSearch } from "../../purchase-orders/new/use-purchase-order-product-search";
import type { ProductSearchResult } from "../../purchase-orders/new/types";

type TransferLine = {
  localId: string;
  productId: string;
  productName: string;
  sku: string;
  requestedQty: number;
  unit: string;
  conversionFactor: number;
};

function makeLocalId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeUnit(unit: string | null | undefined) {
  const value = (unit ?? "PIECE").trim().toUpperCase();
  return value || "PIECE";
}

function numeric(value: unknown, fallback = 1) {
  const parsed = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function defaultUnit(product: ProductSearchResult) {
  const factor = numeric(product.conversionFactor, product.unitsPerCase ?? 1);
  const purchaseUnit = normalizeUnit(product.purchaseUnit || product.packagingUnit);
  if (factor > 1 && purchaseUnit !== "PIECE") return purchaseUnit;
  return normalizeUnit(product.sellingUnit);
}

function defaultFactor(product: ProductSearchResult, unit: string) {
  const sellingUnit = normalizeUnit(product.sellingUnit);
  if (normalizeUnit(unit) === sellingUnit) return 1;
  return numeric(product.conversionFactor, product.unitsPerCase ?? 1);
}

export default function NewTransferOrderPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, locationId, apiLocationId, loading: authLoading } = useAuth();
  const locationsQuery = useLocations(token);
  const locations = useMemo(
    () => (locationsQuery.data?.data ?? []).filter((location) => location.isActive),
    [locationsQuery.data?.data],
  );

  const [sourceLocationId, setSourceLocationId] = useState(apiLocationId || "");
  const [destinationLocationId, setDestinationLocationId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<TransferLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const productSearch = usePurchaseOrderProductSearch({
    token,
    locationId: sourceLocationId || apiLocationId || locationId,
  });

  const canSave =
    !!sourceLocationId &&
    !!destinationLocationId &&
    sourceLocationId !== destinationLocationId &&
    lines.length > 0 &&
    lines.every((line) => line.requestedQty > 0 && line.unit && line.conversionFactor > 0);

  const addProduct = (product: ProductSearchResult) => {
    if (product.isParent) {
      setError("Choose a variant. Parent items are catalog containers only.");
      return;
    }
    const unit = defaultUnit(product);
    const conversionFactor = defaultFactor(product, unit);
    setLines((current) => [
      ...current,
      {
        localId: makeLocalId(),
        productId: product.id,
        productName: getProductDisplayName(product),
        sku: product.sku,
        requestedQty: 1,
        unit,
        conversionFactor,
      },
    ]);
    productSearch.clearAndFocusSearch();
    setError(null);
  };

  const addManualProduct = async () => {
    const product = await productSearch.findManualProduct();
    if (product) {
      addProduct(product);
      return;
    }
    const query = productSearch.productSearch.trim();
    setError(query ? `No product found for "${query}".` : "Enter an item name, SKU, or barcode first.");
  };

  const updateLine = (
    localId: string,
    field: "requestedQty" | "unit" | "conversionFactor",
    value: string,
  ) => {
    setLines((current) =>
      current.map((line) => {
        if (line.localId !== localId) return line;
        if (field === "unit") {
          return { ...line, unit: normalizeUnit(value) };
        }
        const parsed = field === "requestedQty" ? Number.parseInt(value, 10) : Number.parseFloat(value);
        return {
          ...line,
          [field]: Number.isFinite(parsed) && parsed > 0 ? parsed : 0,
        };
      }),
    );
  };

  const removeLine = (localId: string) => {
    setLines((current) => current.filter((line) => line.localId !== localId));
  };

  const handleCreate = async () => {
    if (!canSave) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await apiFetch<{ transfer: { id: string; transferNo: string } }>(
        "/transfers",
        {
          method: "POST",
          token,
          locationId: apiLocationId || locationId,
          body: JSON.stringify({
            sourceLocationId,
            destinationLocationId,
            notes: notes.trim() || undefined,
            lines: lines.map((line) => ({
              productId: line.productId,
              requestedQty: line.requestedQty,
              unit: normalizeUnit(line.unit),
              conversionFactor: line.conversionFactor,
            })),
          }),
        },
      );
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      router.push(`/procurement/transfer-orders/${result.transfer.transferNo}`);
    } catch (err: any) {
      setError(err.message || "Failed to create transfer order");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="flex min-h-full flex-col gap-5 pb-24">
      <div>
        <Link
          href="/procurement/transfer-orders"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Transfer Orders
        </Link>
        <h1 className="text-xl font-semibold">New Transfer Order</h1>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <section className="rounded-lg border bg-white shadow-sm">
        <div className="border-b px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <PackagePlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Route Details</h2>
              <p className="text-sm text-muted-foreground">
                Choose any two different active locations.
              </p>
            </div>
          </div>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-[1fr_auto_1fr]">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Source</span>
            <select
              value={sourceLocationId}
              onChange={(event) => setSourceLocationId(event.target.value)}
              className="h-11 w-full rounded-lg border bg-white px-3 text-sm"
            >
              <option value="">Select source...</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name} ({location.code})
                </option>
              ))}
            </select>
          </label>

          <div className="hidden items-end pb-3 md:flex">
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Destination</span>
            <select
              value={destinationLocationId}
              onChange={(event) => setDestinationLocationId(event.target.value)}
              className="h-11 w-full rounded-lg border bg-white px-3 text-sm"
            >
              <option value="">Select destination...</option>
              {locations
                .filter((location) => location.id !== sourceLocationId)
                .map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name} ({location.code})
                  </option>
                ))}
            </select>
          </label>

          <label className="space-y-2 md:col-span-3">
            <span className="text-sm font-medium text-slate-700">Notes</span>
            <input
              value={notes}
              onChange={(event) => setNotes(event.target.value.slice(0, 1000))}
              className="h-11 w-full rounded-lg border bg-white px-3 text-sm"
              placeholder="Optional transfer notes..."
            />
          </label>
        </div>
      </section>

      <section className="rounded-lg border bg-white shadow-sm">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">Line Items</h2>
        </div>
        <div className="space-y-4 p-5">
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={productSearch.searchRef}
                value={productSearch.productSearch}
                onChange={(event) => productSearch.setProductSearch(event.target.value)}
                onFocus={() => productSearch.productResults.length > 0 && productSearch.setShowDropdown(true)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addManualProduct();
                  }
                }}
                className="h-11 w-full rounded-lg border bg-white pl-10 pr-3 text-sm"
                placeholder="Search items by name, SKU, or barcode..."
              />
              {productSearch.showDropdown && productSearch.productResults.length > 0 && (
                <div
                  ref={productSearch.dropdownRef}
                  className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border bg-white shadow-lg"
                >
                  {productSearch.productResults.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => addProduct(product)}
                      className="flex w-full items-center justify-between gap-4 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-slate-50"
                    >
                      <span>
                        <span className="block font-medium text-slate-950">{getProductDisplayName(product)}</span>
                        <span className="block text-xs text-muted-foreground">{product.sku}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {defaultUnit(product)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={addManualProduct}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              disabled={productSearch.searchLoading}
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>

          <div className="overflow-hidden rounded-lg border">
            <div className="grid grid-cols-[1fr_120px_150px_160px_44px] gap-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <div>Item</div>
              <div>Qty</div>
              <div>UOM</div>
              <div>Factor</div>
              <div />
            </div>
            {lines.length === 0 ? (
              <div className="py-14 text-center text-sm text-muted-foreground">
                Search and add products above.
              </div>
            ) : (
              lines.map((line) => (
                <div
                  key={line.localId}
                  className="grid grid-cols-[1fr_120px_150px_160px_44px] items-center gap-3 border-t px-4 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-950">{line.productName}</div>
                    <div className="text-xs text-muted-foreground">{line.sku}</div>
                  </div>
                  <input
                    type="number"
                    min={1}
                    value={line.requestedQty}
                    onChange={(event) => updateLine(line.localId, "requestedQty", event.target.value)}
                    className="h-10 rounded-lg border px-3 text-sm"
                  />
                  <input
                    value={line.unit}
                    onChange={(event) => updateLine(line.localId, "unit", event.target.value)}
                    className="h-10 rounded-lg border px-3 text-sm uppercase"
                  />
                  <input
                    type="number"
                    min={1}
                    step="0.0001"
                    value={line.conversionFactor}
                    onChange={(event) => updateLine(line.localId, "conversionFactor", event.target.value)}
                    className="h-10 rounded-lg border px-3 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeLine(line.localId)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border text-muted-foreground hover:text-destructive"
                    aria-label="Remove line"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-white/95 px-6 py-3 backdrop-blur">
        <div className="flex justify-end gap-3">
          <Link
            href="/procurement/transfer-orders"
            className="inline-flex h-11 items-center rounded-lg border px-4 text-sm font-semibold hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!canSave || submitting}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {submitting ? "Creating..." : "Create Transfer"}
          </button>
        </div>
      </div>
    </div>
  );
}
