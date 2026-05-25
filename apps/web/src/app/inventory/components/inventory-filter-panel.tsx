"use client";

import { InventoryFilters } from "./inventory-filters";
import type { QuickAddEntityType } from "./quick-add-entity-modal";
import type { InventoryWorkspaceController } from "../lib/use-inventory-workspace";

interface InventoryFilterPanelProps {
  canEdit: boolean;
  inventory: InventoryWorkspaceController;
  onAddModal: (type: QuickAddEntityType | null) => void;
}

export function InventoryFilterPanel({
  canEdit,
  inventory,
  onAddModal,
}: InventoryFilterPanelProps) {
  return (
    <InventoryFilters
      searchInputRef={inventory.searchInputRef}
      searchQuery={inventory.searchQuery}
      categoryFilter={inventory.categoryFilter}
      stockStatusFilter={inventory.stockStatusFilter}
      brandFilter={inventory.brandFilter}
      hideSO={inventory.hideSO}
      hideDC={inventory.hideDC}
      canEdit={canEdit}
      hasActiveFilters={inventory.hasActiveFilters}
      totalItems={inventory.totalItems}
      filteredCategories={inventory.filteredCategories}
      brandsList={inventory.brandsList}
      onSearchQueryChange={inventory.setSearchQuery}
      onSubmitSearch={inventory.submitSearch}
      onClearSearch={inventory.clearSearch}
      onCategoryChange={(value) => {
        inventory.setCategoryFilter(value);
      }}
      onStockStatusChange={inventory.setStockStatusFilter}
      onBrandChange={(value) => {
        inventory.setBrandFilter(value);
        inventory.setPage(1);
      }}
      onToggleHideSO={inventory.toggleHideSO}
      onToggleHideDC={inventory.toggleHideDC}
      onAddModal={onAddModal}
      onClearAllFilters={inventory.clearAllFilters}
    />
  );
}
