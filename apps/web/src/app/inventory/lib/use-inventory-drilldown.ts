import { useCallback, useMemo, useState } from "react";
import { useGroupedCounts, type CategoryCountRow } from "@/hooks/use-grouped-counts";

const NONE = "__none__";

type InventoryDrilldownArgs = {
  token: string;
  locationId: string;
  stockStatus?: string;
  categoryFilter?: string;
  allLocations?: boolean;
};

function sortNullLast<T extends { id?: string | null; name?: string; make?: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const aNull = a.id === null || a.id === NONE || a.make === NONE;
    const bNull = b.id === null || b.id === NONE || b.make === NONE;
    if (aNull && !bNull) return 1;
    if (!aNull && bNull) return -1;
    return 0;
  });
}

export function useInventoryDrilldown({
  token,
  locationId,
  stockStatus,
  categoryFilter,
  allLocations,
}: InventoryDrilldownArgs) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set());
  const [expandedMakes, setExpandedMakes] = useState<Set<string>>(new Set());

  const toggleCategory = useCallback((key: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        setExpandedBrands((s) => {
          const n = new Set<string>();
          s.forEach((k) => {
            if (!k.startsWith(`${key}:`)) n.add(k);
          });
          return n;
        });
        setExpandedMakes((s) => {
          const n = new Set<string>();
          s.forEach((k) => {
            if (!k.startsWith(`${key}:`)) n.add(k);
          });
          return n;
        });
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const toggleBrand = useCallback((key: string) => {
    setExpandedBrands((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        setExpandedMakes((s) => {
          const n = new Set<string>();
          s.forEach((k) => {
            if (!k.startsWith(`${key}:`)) n.add(k);
          });
          return n;
        });
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const toggleMake = useCallback((key: string) => {
    setExpandedMakes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const { data: categoryData, isLoading } = useGroupedCounts<CategoryCountRow>(
    token,
    locationId,
    "category",
    { stockStatus, allLocations },
  );

  const categories = useMemo(() => sortNullLast(categoryData?.data ?? []), [categoryData]);
  const visibleCategories = useMemo(
    () => (categoryFilter ? categories.filter((cat) => cat.id === categoryFilter) : categories),
    [categories, categoryFilter],
  );

  return {
    expandedCategories,
    expandedBrands,
    expandedMakes,
    isLoading,
    toggleBrand,
    toggleCategory,
    toggleMake,
    visibleCategories,
  };
}
