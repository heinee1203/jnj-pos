"use client";

import { ChevronRight, Layers } from "lucide-react";
import { useAuth } from "@/app/auth-context";
import type { ProductRow } from "@/hooks/use-products";
import { cn } from "@/lib/utils";
import { formatPrice, getMarginPercent } from "../lib/inventory-utils";
import { costForStockUom, stockCostUnitLabel, stockPackageContext } from "../lib/stock-format";
import { ParentAwareCheckbox } from "./inventory-selection-controls";
import { RowActions } from "./inventory-row-actions";
import { StockPopover } from "./inventory-stock-display";
import { VariantSubRows } from "./inventory-variant-rows";

type FlatProductRowProps = {
  product: ProductRow;
  showFinancials: boolean;
  isSelected: boolean;
  selectedIds: Set<string>;
  onToggleSelect: () => void;
  onToggleParentSelect: (parentId: string, variantIds: string[]) => void;
  onToggleVariantSelect: (variantId: string, parentId: string, allVariantIds: string[]) => void;
  getParentCheckState: (parentId: string, variantIds: string[]) => boolean | "indeterminate";
  onSelectProduct: () => void;
  isParentExpanded: boolean;
  onToggleParent: () => void;
  colCount: number;
  onDeleteSingle: (id: string, name: string, isParent?: boolean) => void;
  canEdit?: boolean;
  warehouseStockView?: boolean;
};

export function FlatProductRow({
  product: p,
  showFinancials,
  isSelected,
  selectedIds,
  onToggleSelect,
  onToggleParentSelect,
  onToggleVariantSelect,
  getParentCheckState,
  onSelectProduct,
  isParentExpanded,
  onToggleParent,
  colCount,
  onDeleteSingle,
  canEdit = true,
  warehouseStockView = false,
}: FlatProductRowProps) {
  const sell = parseFloat(p.unitPrice) || 0;
  const cost = parseFloat(p.costPrice) || 0;
  const margin = getMarginPercent(sell, cost);
  const stockContext = stockPackageContext({
    conversionFactor: p.conversionFactor,
    packagingUnit: p.packagingUnit,
    purchaseUnit: p.purchaseUnit,
    sellingUnit: p.sellingUnit,
    unitsPerCase: p.unitsPerCase,
  });
  const costPerWarehouseUom = costForStockUom(cost, stockContext);
  const costUnit = stockCostUnitLabel(stockContext);
  const { token, locationId } = useAuth();

  return (
    <>
      <tr
        onClick={onSelectProduct}
        className={cn(
          "cursor-pointer transition-colors duration-75",
          p.isParent && "bg-muted/30 hover:bg-muted/50",
          !p.isParent && isSelected && "bg-primary/[0.05]",
          !p.isParent && !isSelected && p.stockLevel <= 0 && "bg-red-50 hover:bg-red-100/70",
          !p.isParent && !isSelected && p.stockLevel > 0 && "hover:bg-accent/70",
        )}
      >
        <td className="w-8 px-1 py-[5px] text-center">
          {p.isParent && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleParent();
              }}
              className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ChevronRight
                size={14}
                className={cn("transition-transform duration-150", isParentExpanded && "rotate-90")}
              />
            </button>
          )}
        </td>
        <td className="w-9 px-2 py-[5px] text-center" onClick={(e) => e.stopPropagation()}>
          <ParentAwareCheckbox
            isParent={p.isParent ?? false}
            isSelected={isSelected}
            parentId={p.id}
            getParentCheckState={getParentCheckState}
            onToggleSelect={onToggleSelect}
            onToggleParentSelect={onToggleParentSelect}
          />
        </td>
        <td className="px-3 py-[5px]">
          <div className="flex items-center gap-1.5">
            <span className={cn("block truncate text-[12px] leading-snug text-foreground", p.isParent ? "font-semibold" : "font-medium")}>
              {p.name}
            </span>
            {p.isSerialized && !(p as any).isTire && (
              <span className="shrink-0 rounded bg-violet-100 px-1.5 py-px text-[10px] font-medium text-violet-700">SN</span>
            )}
            {(p as any).isTire && (
              <span className="shrink-0 rounded bg-amber-100 px-1.5 py-px text-[10px] font-medium text-amber-700">DOT</span>
            )}
            {p.isParent && (
              <span className="inline-flex items-center gap-1 shrink-0 rounded-full bg-violet-50 px-1.5 py-px text-[10px] font-medium text-violet-600">
                <Layers size={9} />
                variants
              </span>
            )}
          </div>
        </td>
        <td className="px-2 py-[5px] text-right">
          <StockPopover
            productId={p.id}
            stockLevel={p.stockLevel}
            reorderPoint={p.reorderPoint}
            unitsPerCase={p.unitsPerCase}
            packagingUnit={p.packagingUnit}
            sellingUnit={p.sellingUnit}
            purchaseUnit={p.purchaseUnit}
            conversionFactor={p.conversionFactor}
            warehouseStockView={warehouseStockView}
          />
        </td>
        {!warehouseStockView && (
          <td className="px-3 py-[5px] text-right font-medium tabular-nums text-foreground">
            {p.isParent ? (
              <span className="inline-block rounded px-1.5 py-px text-[10px] font-medium leading-normal bg-violet-50/80 text-violet-600">
                Variable
              </span>
            ) : p.isVariablePrice ? (
              <span className="inline-block rounded px-1.5 py-px text-[10px] font-medium leading-normal bg-amber-50/80 text-amber-600">
                Variable
              </span>
            ) : (
              formatPrice(sell)
            )}
          </td>
        )}
        <td className="px-3 py-[5px]">
          {p.brandName ? (
            <span className="text-[12px] text-muted-foreground truncate block max-w-[100px]" title={p.brandName}>{p.brandName}</span>
          ) : (
            <span className="text-[11px] text-muted-foreground/40">{"\u2014"}</span>
          )}
        </td>
        <td className="px-3 py-[5px]">
          {p.categoryName ? (
            <span className="text-[12px] text-muted-foreground truncate block max-w-[120px]" title={p.categoryName}>{p.categoryName}</span>
          ) : (
            <span className="text-[11px] text-muted-foreground/40">{"\u2014"}</span>
          )}
        </td>
        {showFinancials && (
          <>
            <td className="px-3 py-[5px] text-right tabular-nums text-muted-foreground">
              {p.isParent ? (
                <span className="text-muted-foreground/40">{"\u2014"}</span>
              ) : cost > 0 ? (
                warehouseStockView ? (
                  <span className="inline-flex flex-col items-end leading-tight">
                    <span>{formatPrice(costPerWarehouseUom)}</span>
                    <span className="text-[9px] font-medium uppercase text-muted-foreground/70">/ {costUnit}</span>
                  </span>
                ) : (
                  formatPrice(cost)
                )
              ) : (
                "\u2014"
              )}
            </td>
            {!warehouseStockView && (
              <td
                className={cn(
                  "px-3 py-[5px] text-right font-medium tabular-nums",
                  !p.isParent && margin.value > 0 && margin.value < 20 ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {p.isParent ? <span className="text-muted-foreground/40">{"\u2014"}</span> : margin.display}
              </td>
            )}
          </>
        )}
        <td className="px-1 py-[5px] text-center" onClick={(e) => e.stopPropagation()}>
          {canEdit ? (
            <RowActions
              productId={p.id}
              productName={p.name}
              isParent={p.isParent ?? false}
              onView={onSelectProduct}
              onDelete={onDeleteSingle}
            />
          ) : null}
        </td>
      </tr>
      {p.isParent && isParentExpanded && (
        <VariantSubRows
          parentId={p.id}
          parentName={p.name}
          parentUnitsPerCase={p.unitsPerCase}
          parentPackagingUnit={p.packagingUnit}
          parentSellingUnit={p.sellingUnit}
          parentPurchaseUnit={p.purchaseUnit}
          parentConversionFactor={p.conversionFactor}
          token={token}
          locationId={locationId}
          showFinancials={showFinancials}
          colCount={colCount}
          warehouseStockView={warehouseStockView}
          selectedIds={selectedIds}
          onToggleVariantSelect={onToggleVariantSelect}
          onSelectProduct={onSelectProduct}
        />
      )}
    </>
  );
}
