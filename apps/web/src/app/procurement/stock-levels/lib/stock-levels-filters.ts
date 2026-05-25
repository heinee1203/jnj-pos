import type {
  SortDir,
  SortField,
  StockLevelsFilters,
} from "@/hooks/use-stock-levels";

type StockLevelsFilterState = {
  allLocations: boolean;
  belowReorder: boolean;
  categoryFilter: string;
  debouncedSearch: string;
  sortBy: SortField;
  sortDir: SortDir;
  stockStatusFilter: string;
};

type ActiveFilterState = {
  belowReorder: boolean;
  categoryFilter: string;
  searchQuery: string;
  stockStatusFilter: string;
};

function activeValue(value: string): string | undefined {
  return value !== "all" ? value : undefined;
}

function activeStockStatus(
  value: string,
): StockLevelsFilters["stockStatus"] | undefined {
  return value !== "all" ? (value as StockLevelsFilters["stockStatus"]) : undefined;
}

export function buildLocationStockLevelsFilters({
  allLocations,
  belowReorder,
  categoryFilter,
  debouncedSearch,
  sortBy,
  sortDir,
  stockStatusFilter,
}: StockLevelsFilterState): StockLevelsFilters {
  return {
    allLocations,
    search: debouncedSearch || undefined,
    category: activeValue(categoryFilter),
    stockStatus: activeStockStatus(stockStatusFilter),
    belowReorder: belowReorder || undefined,
    sortBy,
    sortDir,
  };
}

export function buildProductStockLevelsFilters({
  belowReorder,
  categoryFilter,
  debouncedSearch,
  sortBy,
  sortDir,
  stockStatusFilter,
}: StockLevelsFilterState): StockLevelsFilters {
  return {
    search: debouncedSearch || undefined,
    categoryId: activeValue(categoryFilter),
    stockStatus: activeStockStatus(stockStatusFilter),
    belowReorder: belowReorder || undefined,
    sortBy,
    sortDir,
  };
}

export function hasActiveStockLevelsFilters({
  belowReorder,
  categoryFilter,
  searchQuery,
  stockStatusFilter,
}: ActiveFilterState): boolean {
  return (
    categoryFilter !== "all" ||
    stockStatusFilter !== "all" ||
    searchQuery !== "" ||
    belowReorder
  );
}
