"use client";

import { useCreateBrand } from "@/hooks/use-brands";
import { useCreateCategory } from "@/hooks/use-categories";

interface UseInventoryQuickCreateOptions {
  token: string | null;
  apiLocationId: string | null;
}

export function useInventoryQuickCreate({
  token,
  apiLocationId,
}: UseInventoryQuickCreateOptions) {
  return {
    createBrand: useCreateBrand(token!, apiLocationId!),
    createCategory: useCreateCategory(token!, apiLocationId!),
  };
}

export type InventoryQuickCreateController = ReturnType<typeof useInventoryQuickCreate>;
