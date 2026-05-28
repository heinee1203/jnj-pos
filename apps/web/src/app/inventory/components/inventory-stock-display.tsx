"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { ALL_LOCATIONS, useAuth } from "@/app/auth-context";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  formatPackageSummary,
  formatWarehouseStock,
  stockPackageContext,
  type StockPackageContext,
} from "../lib/stock-format";

type ProductLocationRow = {
  inventoryId: string | null;
  locationId: string;
  locationName: string;
  locationType: string;
  stockLevel: number;
  reservedLevel: number;
  reorderPoint: number;
  optimalStock: number;
  availableForSale: boolean;
};

export function StockPill({ stockLevel, reorderPoint }: { stockLevel: number; reorderPoint: number }) {
  const display = stockLevel <= 0 ? 0 : stockLevel;

  return (
    <span
      className={cn(
        "inline-flex min-w-[36px] items-center justify-end rounded-md px-2 py-0.5 text-[12px] font-semibold tabular-nums",
        display === 0
          ? "bg-red-50 text-red-700"
          : display <= reorderPoint
            ? "bg-amber-50 text-amber-700"
            : "text-foreground",
      )}
    >
      {display.toLocaleString()}
    </span>
  );
}

type StockPopoverProps = {
  productId: string;
  stockLevel: number;
  reorderPoint: number;
  unitsPerCase?: number;
  packagingUnit?: string | null;
  sellingUnit?: string | null;
  purchaseUnit?: string | null;
  conversionFactor?: string | number | null;
  warehouseStockView?: boolean;
};

export function StockPopover({
  productId,
  stockLevel,
  reorderPoint,
  unitsPerCase = 1,
  packagingUnit,
  sellingUnit,
  purchaseUnit,
  conversionFactor,
  warehouseStockView = false,
}: StockPopoverProps) {
  const packageContext = stockPackageContext({
    conversionFactor,
    packagingUnit,
    purchaseUnit,
    sellingUnit,
    unitsPerCase,
  });
  const hasPkg = packageContext.factor > 1;
  const displayStock = warehouseStockView
    ? formatWarehouseStock(stockLevel, packageContext)
    : { primary: (stockLevel <= 0 ? 0 : stockLevel).toLocaleString(), secondary: null as string | null };
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { token, apiLocationId, locationId } = useAuth();
  const isAllLocations = locationId === ALL_LOCATIONS;

  const { data, isLoading } = useQuery<{ data: ProductLocationRow[] }>({
    queryKey: ["stock-locations", productId],
    queryFn: () =>
      apiFetch(`/inventory/stock-levels/product/${productId}/locations`, {
        token,
        locationId: apiLocationId,
      }),
    enabled: open,
    staleTime: 30_000,
  });

  const locations = useMemo(() => {
    if (!data?.data) return [];
    return [...data.data].sort((a, b) => b.stockLevel - a.stockLevel);
  }, [data]);

  const total = useMemo(
    () => Math.max(0, locations.reduce((sum, loc) => sum + Math.max(0, loc.stockLevel), 0)),
    [locations],
  );

  useEffect(() => {
    if (!open) return;

    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation();
          if (!open && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const goUp = spaceBelow < 300;
            setOpenUpward(goUp);
            setPopoverPos({
              top: goUp ? rect.top : rect.bottom + 4,
              left: rect.right - 224,
            });
          }
          setOpen(!open);
        }}
        className="group"
        title="Click to see per-location stock"
      >
        <span
          className={cn(
            "inline-flex min-w-[36px] flex-col items-end justify-center rounded-md px-2 py-0.5 text-[12px] font-semibold tabular-nums cursor-pointer transition-all",
            warehouseStockView && "min-w-[78px]",
            stockLevel <= 0
              ? "bg-red-50 text-red-700 group-hover:bg-red-100"
              : stockLevel <= reorderPoint
                ? "bg-amber-50 text-amber-700 group-hover:bg-amber-100"
              : "text-foreground group-hover:bg-muted",
          )}
        >
          <span>{displayStock.primary}</span>
          {displayStock.secondary && (
            <span className="text-[9px] font-medium leading-none text-muted-foreground">
              {displayStock.secondary}
            </span>
          )}
        </span>
      </button>

      {open &&
        createPortal(
          <div
            className="fixed z-[9999] w-56 rounded-lg border border-border bg-background shadow-lg animate-in fade-in duration-100"
            style={{
              top: openUpward ? undefined : popoverPos.top,
              bottom: openUpward ? window.innerHeight - popoverPos.top + 4 : undefined,
              left: Math.max(8, popoverPos.left),
            }}
            ref={ref}
          >
            <div className="border-b border-border px-3 py-2">
              <span className="text-[11px] font-semibold text-foreground">Stock by Location</span>
              {hasPkg && (
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  1 {packageContext.packageUnit} = {packageContext.factor} {packageContext.sellingUnit}
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 size={14} className="animate-spin text-muted-foreground" />
              </div>
            ) : locations.length === 0 ? (
              <div className="px-3 py-3 text-center text-[11px] text-muted-foreground">
                No locations found
              </div>
            ) : (
              <div className="py-1">
                {locations.map((loc) => {
                  const isCurrent = !isAllLocations && loc.locationId === apiLocationId;

                  return (
                    <div
                      key={loc.locationId}
                      className={cn(
                        "flex items-center justify-between px-3 py-1.5",
                        isCurrent && "bg-primary/[0.05]",
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={cn(
                            "h-1.5 w-1.5 shrink-0 rounded-full",
                            loc.stockLevel > 0 ? "bg-emerald-500" : "bg-red-400",
                          )}
                        />
                        <span
                          className={cn(
                            "truncate text-[11px]",
                            isCurrent ? "font-semibold text-foreground" : "text-muted-foreground",
                          )}
                        >
                          {loc.locationName}
                          {isCurrent && <span className="ml-1 text-[9px] text-primary">(current)</span>}
                        </span>
                      </div>
                      <div className="ml-2 shrink-0 text-right">
                        <LocationStockValue
                          packageContext={packageContext}
                          stockLevel={loc.stockLevel}
                          warehouseStockView={warehouseStockView}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!isLoading && locations.length > 0 && (
              <div className="flex items-center justify-between border-t border-border px-3 py-1.5">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Total</span>
                <div className="text-right">
                  <span className="text-[11px] font-bold tabular-nums text-foreground">
                    {warehouseStockView ? formatWarehouseStock(total, packageContext).primary : total.toLocaleString()}
                  </span>
                  {warehouseStockView && formatWarehouseStock(total, packageContext).secondary && (
                    <span className="ml-1 text-[9px] text-muted-foreground">
                      {formatWarehouseStock(total, packageContext).secondary}
                    </span>
                  )}
                  {!warehouseStockView && formatPackageSummary(total, packageContext) && (
                    <span className="ml-1 text-[9px] text-muted-foreground">
                      ({formatPackageSummary(total, packageContext)})
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

function LocationStockValue({
  packageContext,
  stockLevel,
  warehouseStockView,
}: {
  packageContext: StockPackageContext;
  stockLevel: number;
  warehouseStockView: boolean;
}) {
  const s = Math.max(0, stockLevel);
  const packageSummary = formatPackageSummary(s, packageContext);

  if (warehouseStockView) {
    const display = formatWarehouseStock(s, packageContext);
    return (
      <>
        <span className="text-[11px] font-semibold tabular-nums text-foreground">
          {display.primary}
        </span>
        {display.secondary && (
          <span className="ml-1 text-[9px] text-muted-foreground">
            {display.secondary}
          </span>
        )}
      </>
    );
  }

  return (
    <>
      <span className={cn("text-[11px] font-semibold tabular-nums", s === 0 ? "text-red-600" : "text-foreground")}>
        {s.toLocaleString()}
      </span>
      {packageSummary && (
        <span className="ml-1 text-[9px] text-muted-foreground">
          ({packageSummary})
        </span>
      )}
    </>
  );
}
