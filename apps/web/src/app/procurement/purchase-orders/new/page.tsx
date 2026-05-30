"use client";

import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/app/auth-context";
import { apiFetch } from "@/lib/api";
import { useSuppliers, type SupplierRow } from "@/hooks/use-suppliers";
import { useLocations } from "@/hooks/use-locations";
import { getProductDisplayName } from "@/lib/format";
import { CSVPreviewModal } from "./components/csv-preview-modal";
import { AdditionalFeesCard } from "./components/additional-fees-card";
import { LineItemsCard } from "./components/line-items-card";
import { OrderDetailsCard } from "./components/order-details-card";
import { PurchaseOrderActionBar } from "./components/purchase-order-action-bar";
import type { CSVPreviewRow, POFeeInput, ProductSearchResult } from "./types";
import { usePurchaseOrderLines } from "./use-purchase-order-lines";
import { usePurchaseOrderProductSearch } from "./use-purchase-order-product-search";

// ── Types ──


// ── Helpers ──

function internalSupplierMnemonic(name: string) {
  const source = name.toUpperCase();
  const words = source.match(/[A-Z]+/g) ?? [];
  const initials = words.map((word) => word[0]).join("");
  const letters = (initials.length >= 2 ? initials : words.join("")).replace(/[^A-Z]/g, "");
  return letters ? letters.slice(0, 2).padEnd(2, "X") : undefined;
}

function makeLocalId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function parseMoney(value: string) {
  const amount = Number.parseFloat(value.replace(/,/g, ""));
  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
}

function buildNotesWithFees(notes: string, fees: POFeeInput[]) {
  const cleanNotes = notes.trim();
  const validFees = fees
    .map((fee) => ({ label: fee.label.trim(), amount: parseMoney(fee.amount) }))
    .filter((fee) => fee.label && fee.amount > 0);

  if (validFees.length === 0) return cleanNotes || undefined;

  const feeLines = validFees.map((fee) => `- ${fee.label}: PHP ${fee.amount.toFixed(2)}`);
  return [cleanNotes, "Additional Fees:", ...feeLines]
    .filter(Boolean)
    .join("\n");
}

function purchaseFactor(product: {
  conversionFactor?: number | string | null;
  unitsPerCase?: number | null;
}) {
  const conversionFactor = parseFloat(String(product.conversionFactor ?? ""));
  if (Number.isFinite(conversionFactor) && conversionFactor > 1) {
    return conversionFactor;
  }
  return product.unitsPerCase && product.unitsPerCase > 1 ? product.unitsPerCase : 1;
}

function purchaseUnit(product: {
  purchaseUnit?: string | null;
  packagingUnit?: string | null;
}) {
  return product.purchaseUnit || product.packagingUnit || null;
}

function defaultPurchaseCost(product: {
  costPrice?: string | null;
}, factor: number) {
  const baseCost = parseFloat(product.costPrice || "0");
  if (!Number.isFinite(baseCost) || baseCost <= 0) return product.costPrice || "0.00";
  return factor > 1 ? (baseCost * factor).toFixed(2) : product.costPrice || "0.00";
}

// ══════════════════════════════════════════════════════════
// New Purchase Order Page
// ══════════════════════════════════════════════════════════

export default function NewPurchaseOrderPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-32 text-muted-foreground text-sm">Loading...</div>}>
      <NewPurchaseOrderInner />
    </Suspense>
  );
}

function NewPurchaseOrderInner() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const { token, locationId, apiLocationId, loading: authLoading } = useAuth();

  // ── Data hooks ──
  const suppliersQuery = useSuppliers(token, locationId);
  const locationsQuery = useLocations(token);

  const suppliers = suppliersQuery.data?.data ?? [];
  const locations = locationsQuery.data?.data ?? [];
  const validLocations = useMemo(
    () => locations.filter((l) => l.type !== "TRANSIT_BUFFER"),
    [locations],
  );

  // ── Order details state ──
  const [supplierId, setSupplierId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [notes, setNotes] = useState("");
  const [fees, setFees] = useState<POFeeInput[]>([]);

  // Auto-set destination to current location (use apiLocationId as fallback when "All Locations" is selected)
  useEffect(() => {
    if (!destinationId && validLocations.length > 0) {
      const realId = locationId === "ALL" ? apiLocationId : locationId;
      if (realId && validLocations.find((l) => l.id === realId)) {
        setDestinationId(realId);
      }
    }
  }, [locationId, apiLocationId, destinationId, validLocations]);

  // ── Pre-populate from query params (e.g. from dashboard reorder) ──
  const prefillDone = useRef(false);
  useEffect(() => {
    if (prefillDone.current || !token || !locationId || authLoading) return;
    const qProductId = searchParams.get("productId");
    const qQty = searchParams.get("qty");
    const qSupplierId = searchParams.get("supplierId");
    const qUnitCost = searchParams.get("unitCost");
    if (!qProductId && !qSupplierId) return;
    prefillDone.current = true;

    // Pre-select supplier immediately (don't wait for product fetch)
    if (qSupplierId) setSupplierId(qSupplierId);
    if (!qProductId) return;

    (async () => {
      try {
        const product = await apiFetch<any>(
          `/products/${qProductId}`,
          { token, locationId },
        );
        if (!product?.id) return;
        if (product.isParent) {
          setError("Choose a variant. Parent items are catalog containers only.");
          return;
        }
        const qty = Math.max(parseInt(qQty || "1", 10) || 1, 1);
        // Use unitCost from query param (last PO cost), fall back to product cost price
        const factor = purchaseFactor(product);
        const cost = qUnitCost && parseFloat(qUnitCost) > 0
          ? qUnitCost
          : defaultPurchaseCost(product, factor);
        const unit = purchaseUnit(product);
        setLines([{
          localId: crypto.randomUUID(),
          productId: product.id,
          productName: getProductDisplayName(product),
          sku: product.sku,
          orderedQty: qty,
          listPrice: cost,
          discountChain: "",
          netCost: cost,
          isManualCost: false,
          unitsPerCase: factor,
          packagingUnit: unit,
          entryUnit: factor > 1 ? "case" : "piece",
          sellingUnit: product.sellingUnit ?? "piece",
          purchaseUnit: product.purchaseUnit ?? null,
          conversionFactor: factor,
        }]);
      } catch {
        // Ignore — user can add manually
      }
    })();
  }, [token, locationId, authLoading, searchParams]);

  // ── Inline supplier creation ──
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [newSupplierForm, setNewSupplierForm] = useState({
    name: "",
    mnemonicCode: "",
    contactEmail: "",
    contactPhone: "",
  });
  const [supplierSaving, setSupplierSaving] = useState(false);
  const [supplierError, setSupplierError] = useState<string | null>(null);

  // ── Line items state ──
  const {
    lines,
    setLines,
    addProductLine,
    addCsvProductLine,
    updateLine,
    removeLine,
    grandTotal,
  } = usePurchaseOrderLines();

  const productSearchController = usePurchaseOrderProductSearch({
    token,
    locationId: apiLocationId || locationId,
  });

  // ── CSV state ──
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvPreview, setCsvPreview] = useState<CSVPreviewRow[]>([]);
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);

  // ── Submit state ──
  const [submitting, setSubmitting] = useState(false);
  const [submitAction, setSubmitAction] = useState<"draft" | "submit" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const feesTotal = useMemo(
    () => fees.reduce((sum, fee) => sum + parseMoney(fee.amount), 0),
    [fees],
  );
  const orderTotal = grandTotal + feesTotal;

  const addFee = () => {
    setFees((current) => [
      ...current,
      { localId: makeLocalId(), label: current.length === 0 ? "Freight" : "", amount: "" },
    ]);
  };

  const updateFee = (
    localId: string,
    field: keyof Omit<POFeeInput, "localId">,
    value: string,
  ) => {
    setFees((current) =>
      current.map((fee) =>
        fee.localId === localId
          ? {
              ...fee,
              [field]: field === "label" ? value.slice(0, 80) : value.replace(/[^\d.,]/g, "").slice(0, 20),
            }
          : fee,
      ),
    );
  };

  const removeFee = (localId: string) => {
    setFees((current) => current.filter((fee) => fee.localId !== localId));
  };

  // ── Add product to lines ──
  const addProduct = (product: ProductSearchResult) => {
    if (product.isParent) {
      setCsvError("Choose a variant. Parent items are catalog containers only.");
      return;
    }
    setCsvError(null);
    addProductLine(product);
    productSearchController.clearAndFocusSearch();
  };

  const addManualProduct = async () => {
    const product = await productSearchController.findManualProduct();
    if (product) {
      addProduct(product);
    } else {
      const query = productSearchController.productSearch.trim();
      setCsvError(query ? `No product found for "${query}".` : "Enter an item name, SKU, or barcode first.");
    }
  };

  // ── Can save? ──
  const canSave =
    !!supplierId &&
    !!destinationId &&
    lines.length > 0 &&
    lines.every(
      (l) => l.orderedQty > 0 && parseFloat(l.netCost) > 0,
    );

  // ── Inline supplier creation ──
  const handleCreateSupplier = async () => {
    if (!newSupplierForm.name.trim()) return;
    setSupplierSaving(true);
    setSupplierError(null);
    try {
      const res = await apiFetch<{ data: SupplierRow }>("/procurement/suppliers", {
        method: "POST",
        body: JSON.stringify({
          name: newSupplierForm.name.trim(),
          mnemonicCode: internalSupplierMnemonic(newSupplierForm.name),
          contactEmail: newSupplierForm.contactEmail.trim() || undefined,
          contactPhone: newSupplierForm.contactPhone.trim() || undefined,
        }),
        token,
        locationId,
      });
      // Invalidate supplier cache and auto-select
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setSupplierId(res.data.id);
      setShowNewSupplier(false);
      setNewSupplierForm({ name: "", mnemonicCode: "", contactEmail: "", contactPhone: "" });
    } catch (err: any) {
      setSupplierError(err.message || "Failed to create supplier");
    } finally {
      setSupplierSaving(false);
    }
  };

  // ── Save / Submit ──
  const handleSave = async (action: "draft" | "submit") => {
    if (!canSave) return;
    setSubmitting(true);
    setSubmitAction(action);
    setError(null);

    try {
      const notesWithFees = buildNotesWithFees(notes, fees);
      if ((notesWithFees?.length ?? 0) > 1000) {
        setError("Notes and additional fees must be 1000 characters or fewer.");
        return;
      }

      const body = {
        supplierId,
        destinationLocationId: destinationId,
        expectedDeliveryDate: expectedDelivery
          ? new Date(expectedDelivery).toISOString()
          : undefined,
        notes: notesWithFees,
        lines: lines.map((l) => {
          const unit = l.entryUnit === "case" ? (l.packagingUnit || l.purchaseUnit || "CASE") : l.sellingUnit;
          const conversionFactor = l.entryUnit === "case" ? l.conversionFactor || l.unitsPerCase : 1;
          return {
            productId: l.productId,
            orderedQty: l.orderedQty,
            unitCost: l.netCost,
            listPrice: l.listPrice,
            discountChain: l.discountChain || undefined,
            unit,
            conversionFactor,
          };
        }),
      };

      const result = await apiFetch<{ po: { id: string; poNo: string } }>(
        "/procurement/purchase-orders",
        {
          method: "POST",
          body: JSON.stringify(body),
          token,
          locationId,
        },
      );

      if (action === "submit") {
        // Immediately submit after creating
        await apiFetch(
          `/procurement/purchase-orders/${result.po.id}/submit`,
          {
            method: "POST",
            body: JSON.stringify({ idempotencyKey: crypto.randomUUID() }),
            token,
            locationId,
          },
        );
      }

      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      router.push(`/procurement/purchase-orders/${result.po.poNo}`);
    } catch (err: any) {
      setError(err.message || "Failed to create purchase order");
    } finally {
      setSubmitting(false);
      setSubmitAction(null);
    }
  };

  // ── CSV Import ──
  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset file input so same file can be re-uploaded
    e.target.value = "";
    setCsvError(null);

    const text = await file.text();
    const rows = text.split("\n").map((row) =>
      row.split(",").map((cell) => cell.trim().replace(/^"|"$/g, "")),
    );
    if (rows.length < 2) {
      setCsvError("CSV must have at least a header row and one data row.");
      return;
    }

    const header = rows[0].map((h) =>
      h.toLowerCase().replace(/[^a-z0-9]/g, ""),
    );
    const skuIdx = header.findIndex((h) =>
      ["sku", "productsku", "itemsku", "barcode"].includes(h),
    );
    const qtyIdx = header.findIndex((h) =>
      ["qty", "quantity", "orderedqty", "order"].includes(h),
    );
    const costIdx = header.findIndex((h) =>
      ["cost", "unitcost", "price", "purchasecost", "listprice"].includes(h),
    );
    const discountIdx = header.findIndex((h) =>
      ["discount", "discountchain", "less"].includes(h),
    );

    if (skuIdx === -1) {
      setCsvError("CSV must have a SKU column (sku, productsku, itemsku, or barcode).");
      return;
    }

    const dataRows = rows.slice(1).filter((r) => r.length > skuIdx && r[skuIdx].trim());
    if (dataRows.length === 0) {
      setCsvError("No data rows found in CSV.");
      return;
    }

    // Parse rows into preview format
    const preview: CSVPreviewRow[] = dataRows.map((r) => ({
      sku: r[skuIdx].trim(),
      qty: qtyIdx >= 0 ? Math.max(1, parseInt(r[qtyIdx]) || 1) : 1,
      listPrice: costIdx >= 0 ? r[costIdx].trim() || "0" : "0",
      discount:
        discountIdx >= 0
          ? r[discountIdx]
              .trim()
              .replace(/\//g, ", ")
          : "",
      match: null,
      status: "searching",
    }));

    setCsvPreview(preview);
    setShowCSVModal(true);

    // Look up each SKU
    for (let i = 0; i < preview.length; i++) {
      try {
        const res = await apiFetch<{ data: ProductSearchResult[] }>(
          `/products?search=${encodeURIComponent(preview[i].sku)}&limit=5&sellableOnly=true`,
          { token, locationId },
        );
        const exactMatch = res.data.find(
          (p) =>
            p.sku === preview[i].sku ||
            p.barcode === preview[i].sku ||
            p.mnemonicSku === preview[i].sku,
        );
        setCsvPreview((prev) =>
          prev.map((row, idx) =>
            idx === i
              ? {
                  ...row,
                  match: exactMatch || null,
                  status: exactMatch ? "matched" : "not_found",
                }
              : row,
          ),
        );
      } catch {
        setCsvPreview((prev) =>
          prev.map((row, idx) =>
            idx === i ? { ...row, status: "not_found" } : row,
          ),
        );
      }
    }
  };

  const csvMatched = csvPreview.filter((r) => r.status === "matched");

  const handleCSVImport = () => {
    for (const row of csvMatched) {
      if (!row.match) continue;
      addCsvProductLine(row.match, row);
    }
    setShowCSVModal(false);
    setCsvPreview([]);
  };

  const handleDownloadPOTemplate = () => {
    const headers = "SKU,Qty,List Price,Discount,Notes";
    const sample1 = 'SDG-30003,10,26500,"20,5,3",Sample with chain discount';
    const sample2 = "DB-1390,20,1550,15,Sample with single discount";
    const sample3 = "14624134,5,3400,,Sample with no discount";
    const csv = `\ufeff${headers}\n${sample1}\n${sample2}\n${sample3}\n`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "JNJ-po-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Loading state ──
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Back link + title */}
      <div className="mb-4">
        <Link
          href="/procurement/purchase-orders"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Purchase Orders
        </Link>
        <h2 className="text-lg font-semibold">New Purchase Order</h2>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <OrderDetailsCard
        supplierId={supplierId}
        suppliers={suppliers}
        destinationId={destinationId}
        locations={validLocations}
        expectedDelivery={expectedDelivery}
        notes={notes}
        showNewSupplier={showNewSupplier}
        newSupplierForm={newSupplierForm}
        supplierSaving={supplierSaving}
        supplierError={supplierError}
        onSupplierChange={setSupplierId}
        onDestinationChange={setDestinationId}
        onExpectedDeliveryChange={setExpectedDelivery}
        onNotesChange={setNotes}
        onShowNewSupplierChange={setShowNewSupplier}
        onNewSupplierFormChange={setNewSupplierForm}
        onSupplierErrorChange={setSupplierError}
        onCreateSupplier={handleCreateSupplier}
      />

      <LineItemsCard
        lines={lines}
        grandTotal={grandTotal}
        csvError={csvError}
        productSearchController={productSearchController}
        fileInputRef={fileInputRef}
        onManualAdd={addManualProduct}
        onAddProduct={addProduct}
        onCSVUpload={handleCSVUpload}
        onDownloadTemplate={handleDownloadPOTemplate}
        onRemoveLine={removeLine}
        onUpdateLine={updateLine}
      />

      <AdditionalFeesCard
        fees={fees}
        feesTotal={feesTotal}
        itemsTotal={grandTotal}
        orderTotal={orderTotal}
        onAddFee={addFee}
        onRemoveFee={removeFee}
        onUpdateFee={updateFee}
      />

      <PurchaseOrderActionBar
        canSave={canSave}
        submitting={submitting}
        submitAction={submitAction}
        onSave={handleSave}
      />

      {showCSVModal && (
        <CSVPreviewModal
          rows={csvPreview}
          onClose={() => {
            setShowCSVModal(false);
            setCsvPreview([]);
          }}
          onImport={handleCSVImport}
        />
      )}
    </div>
  );
}
