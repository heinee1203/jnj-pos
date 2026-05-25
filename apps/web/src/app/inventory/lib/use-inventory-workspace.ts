"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ALL_LOCATIONS } from "@/app/auth-context";
import { useBrands } from "@/hooks/use-brands";
import { useCategories } from "@/hooks/use-categories";
import { useLocations, type LocationRow } from "@/hooks/use-locations";
import { useProducts, type SortDir, type SortField } from "@/hooks/use-products";
import { DEFAULT_PAGE_SIZE } from "./inventory-utils";

interface UseInventoryWorkspaceOptions {
  token: string | null;
  apiLocationId: string | null;
  locationId: string | null;
}

export function useInventoryWorkspace({
  token,
  apiLocationId,
  locationId,
}: UseInventoryWorkspaceOptions) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [stockStatusFilter, setStockStatusFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [viewMode, setViewMode] = useState<"flat" | "nested">("flat");
  const [hideSO, setHideSO] = useState(() => typeof window !== "undefined" ? localStorage.getItem("item-list-hide-so") === "true" : false);
  const [hideDC, setHideDC] = useState(() => typeof window !== "undefined" ? localStorage.getItem("item-list-hide-dc") === "true" : false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isAllLocations = locationId === ALL_LOCATIONS;
  const effectiveViewMode = debouncedSearch.length >= 2 ? "flat" : viewMode;

  const locationsQuery = useLocations(token!);
  const orgLocations = useMemo(() => {
    return (locationsQuery.data?.data ?? []).filter((location: LocationRow) => location.isActive);
  }, [locationsQuery.data]);

  const categoriesQuery = useCategories(token!, apiLocationId!);
  const filteredCategories = useMemo(() => {
    const categories = categoriesQuery.data?.data ?? [];
    return [...categories].sort((a, b) => a.name.localeCompare(b.name));
  }, [categoriesQuery.data]);

  const brandsQuery = useBrands(token!, apiLocationId!);
  const brandsList = useMemo(() => {
    const rows = brandsQuery.data?.data ?? [];
    return [...rows].sort((a, b) => a.name.localeCompare(b.name));
  }, [brandsQuery.data]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryFilter, stockStatusFilter, brandFilter, sortBy, sortDir, locationId, pageSize, viewMode]);

  const { data, isLoading, isFetching } = useProducts(token!, apiLocationId!, {
    search: debouncedSearch,
    categoryId: categoryFilter || undefined,
    stockStatus: stockStatusFilter,
    brandId: brandFilter || undefined,
    sortBy,
    sortDir,
    page,
    limit: pageSize,
    parentOnly: true,
    allLocations: isAllLocations,
    excludeSO: hideSO || undefined,
    excludeDC: hideDC || undefined,
  });

  const products = data?.data ?? [];
  const totalItems = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const hasMore = data?.hasMore ?? false;

  const submitSearch = useCallback(() => {
    const value = searchInputRef.current?.value?.trim() ?? searchQuery.trim();
    setSearchQuery(value);
    setDebouncedSearch(value);
    setPage(1);
  }, [searchQuery]);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setDebouncedSearch("");
    setPage(1);
    if (searchInputRef.current) searchInputRef.current.value = "";
  }, []);

  const handleSort = useCallback(
    (field: SortField) => {
      if (field === sortBy) {
        if (sortDir === "asc") {
          setSortDir("desc");
        } else {
          setSortBy("name");
          setSortDir("asc");
        }
      } else {
        setSortBy(field);
        setSortDir("asc");
      }
    },
    [sortBy, sortDir],
  );

  const hasActiveFilters =
    categoryFilter !== "" || stockStatusFilter !== "" || brandFilter !== "" || searchQuery.trim() !== "" || hideSO || hideDC;

  const clearAllFilters = useCallback(() => {
    setCategoryFilter("");
    setStockStatusFilter("");
    setBrandFilter("");
    setSearchQuery("");
    setDebouncedSearch("");
    setHideSO(false);
    setHideDC(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("item-list-hide-so", "false");
      localStorage.setItem("item-list-hide-dc", "false");
    }
  }, []);

  const toggleHideSO = useCallback(() => {
    const next = !hideSO;
    setHideSO(next);
    localStorage.setItem("item-list-hide-so", String(next));
    setPage(1);
  }, [hideSO]);

  const toggleHideDC = useCallback(() => {
    const next = !hideDC;
    setHideDC(next);
    localStorage.setItem("item-list-hide-dc", String(next));
    setPage(1);
  }, [hideDC]);

  return {
    brandFilter,
    brandsList,
    categoryFilter,
    clearAllFilters,
    clearSearch,
    debouncedSearch,
    effectiveViewMode,
    filteredCategories,
    handleSort,
    hasActiveFilters,
    hasMore,
    hideDC,
    hideSO,
    isAllLocations,
    isFetching,
    isLoading,
    orgLocations,
    page,
    pageSize,
    products,
    searchInputRef,
    searchQuery,
    setBrandFilter,
    setCategoryFilter,
    setPage,
    setPageSize,
    setSearchQuery,
    setStockStatusFilter,
    setViewMode,
    sortBy,
    sortDir,
    stockStatusFilter,
    submitSearch,
    toggleHideDC,
    toggleHideSO,
    totalItems,
    totalPages,
    viewMode,
  };
}

export type InventoryWorkspaceController = ReturnType<typeof useInventoryWorkspace>;
