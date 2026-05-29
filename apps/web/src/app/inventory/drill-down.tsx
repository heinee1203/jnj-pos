"use client";

import { DrilldownCategoryRow } from "./components/drilldown-hierarchy-rows";
import { DrilldownLoadingRow } from "./components/drilldown-items-table";
import { useInventoryDrilldown } from "./lib/use-inventory-drilldown";

const NONE = "__none__";

interface DrillDownViewProps {
  token: string;
  locationId: string;
  stockStatus?: string;
  showFinancials: boolean;
  warehouseStockView: boolean;
  onSelectProduct: (id: string) => void;
  categoryFilter?: string;
  brandFilter?: string;
  colCount: number;
  allLocations?: boolean;
}

export function DrillDownView({
  token,
  locationId,
  stockStatus,
  showFinancials,
  warehouseStockView,
  onSelectProduct,
  categoryFilter,
  colCount,
  allLocations,
}: DrillDownViewProps) {
  const {
    expandedBrands,
    expandedCategories,
    expandedMakes,
    isLoading,
    toggleBrand,
    toggleCategory,
    toggleMake,
    visibleCategories,
  } = useInventoryDrilldown({
    token,
    locationId,
    stockStatus,
    categoryFilter,
    allLocations,
  });

  if (isLoading) return <DrilldownLoadingRow colCount={colCount} />;

  return (
    <>
      {visibleCategories.map((cat) => {
        const categoryId = cat.id ?? NONE;
        const catKey = categoryId;
        const isExpanded = expandedCategories.has(catKey);
        const name = cat.id ? cat.name : "No Category";

        return (
          <DrilldownCategoryRow
            key={catKey}
            catKey={catKey}
            name={name}
            color={cat.color}
            itemCount={cat.itemCount}
            brandCount={cat.brandCount}
            isExpanded={isExpanded}
            onToggle={() => toggleCategory(catKey)}
            token={token}
            locationId={locationId}
            categoryId={categoryId}
            stockStatus={stockStatus}
            showFinancials={showFinancials}
            warehouseStockView={warehouseStockView}
            onSelectProduct={onSelectProduct}
            colCount={colCount}
            expandedBrands={expandedBrands}
            expandedMakes={expandedMakes}
            onToggleBrand={toggleBrand}
            onToggleMake={toggleMake}
            allLocations={allLocations}
          />
        );
      })}
      {visibleCategories.length === 0 && (
        <tr>
          <td className="w-9" />
          <td colSpan={colCount - 1} className="py-8 text-center text-sm text-muted-foreground">
            No categories found
          </td>
        </tr>
      )}
    </>
  );
}
