"use client";

import { useMemo } from "react";
import { useCategories, type CategoryRow } from "@/hooks/use-categories";

type UseStockLevelsTaxonomyArgs = {
  categoryFilter: string;
  locationId: string | null | undefined;
  token: string | null | undefined;
};

type StockLevelsTaxonomy = {
  allCategories: CategoryRow[];
};

export function useStockLevelsTaxonomy({
  categoryFilter,
  locationId,
  token,
}: UseStockLevelsTaxonomyArgs): StockLevelsTaxonomy {
  const categoriesQuery = useCategories(token ?? "", locationId ?? "", {});

  const allCategories = categoriesQuery.data?.data ?? [];

  return {
    allCategories,
  };
}
