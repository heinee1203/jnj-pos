"use client";

import { X } from "lucide-react";
import { useQuickAddProductForm } from "../lib/use-quick-add-product-form";
import { QuickAddFooter } from "./quick-add-footer";
import { QuickAddIdentifiersSection } from "./quick-add-identifiers-section";
import { QuickAddIdentitySection } from "./quick-add-identity-section";
import { QuickAddPricingSection } from "./quick-add-pricing-section";
import { QuickAddStockSection } from "./quick-add-stock-section";
import { QuickAddTaxonomySection } from "./quick-add-taxonomy-section";

export function QuickAddDrawer({
  token,
  locationId,
  userRole,
  isAllLocations,
  onClose,
}: {
  token: string;
  locationId: string;
  userRole: string;
  isAllLocations: boolean;
  onClose: () => void;
}) {
  const {
    allLocations,
    barcode,
    brandId,
    brandsList,
    categoryId,
    costPrice,
    createMutation,
    enabledLocationIds,
    error,
    allCategories,
    handleCategoryChange,
    handleGenerateBarcode,
    handleGenerateSku,
    handleSave,
    initialStock,
    isValid,
    name,
    quickAddBrand,
    quickAddCategory,
    setBarcode,
    setBrandId,
    setCostPrice,
    setInitialStock,
    setName,
    setSku,
    setTrackInventory,
    setUnitPrice,
    showCost,
    sku,
    toggleAllLocations,
    toggleLocation,
    trackInventory,
    unitPrice,
  } = useQuickAddProductForm({
    token,
    locationId,
    userRole,
    isAllLocations,
    onClose,
  });

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 z-50 w-[420px] max-w-full border-l border-border bg-background shadow-2xl animate-in slide-in-from-right duration-200">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Quick Add Item</h3>
              <p className="text-[11px] text-muted-foreground">Create a school supply or merchandise item</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Close drawer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-[12px] text-destructive">
                {error}
              </div>
            )}

            <QuickAddIdentitySection
              name={name}
              onGenerateSku={handleGenerateSku}
              setName={setName}
              setSku={setSku}
              sku={sku}
            />

            <QuickAddTaxonomySection
              brandId={brandId}
              brandsList={brandsList}
              categoryId={categoryId}
              allCategories={allCategories}
              handleCategoryChange={handleCategoryChange}
              quickAddBrand={quickAddBrand}
              quickAddCategory={quickAddCategory}
              setBrandId={setBrandId}
            />

            <QuickAddPricingSection
              costPrice={costPrice}
              setCostPrice={setCostPrice}
              setUnitPrice={setUnitPrice}
              showCost={showCost}
              unitPrice={unitPrice}
            />

            <QuickAddIdentifiersSection
              barcode={barcode}
              onGenerateBarcode={handleGenerateBarcode}
              setBarcode={setBarcode}
            />

            <QuickAddStockSection
              allLocations={allLocations}
              enabledLocationIds={enabledLocationIds}
              initialStock={initialStock}
              isAllLocations={isAllLocations}
              setInitialStock={setInitialStock}
              setTrackInventory={setTrackInventory}
              toggleAllLocations={toggleAllLocations}
              toggleLocation={toggleLocation}
              trackInventory={trackInventory}
            />
          </div>

          <QuickAddFooter
            isPending={createMutation.isPending}
            isValid={isValid}
            onSave={() => handleSave(false)}
            onSaveAndOpen={() => handleSave(true)}
          />
        </div>
      </div>
    </>
  );
}
