import { useEffect, useMemo, useState } from "react";
import { useBrands, useCreateBrand } from "@/hooks/use-brands";
import { useCategories, useCreateCategory } from "@/hooks/use-categories";
import { useLocations } from "@/hooks/use-locations";
import { useCreateProduct } from "@/hooks/use-products";
import { generateEan13Barcode, generateSku } from "./identifier-generators";

type UseQuickAddProductFormArgs = {
  token: string;
  locationId: string;
  userRole: string;
  isAllLocations: boolean;
  onClose: () => void;
};

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function getApiErrorMessage(err: any): string {
  const fieldErrors = err?.body?.details?.fieldErrors as
    | Record<string, string[] | undefined>
    | undefined;
  const firstFieldError = fieldErrors
    ? Object.values(fieldErrors).flat().find(Boolean)
    : undefined;

  return firstFieldError || err?.message || "Failed to create item";
}

export function useQuickAddProductForm({
  token,
  locationId,
  userRole,
  isAllLocations,
  onClose,
}: UseQuickAddProductFormArgs) {
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [barcode, setBarcode] = useState("");
  const [trackInventory, setTrackInventory] = useState(true);
  const [initialStock, setInitialStock] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [enabledLocationIds, setEnabledLocationIds] = useState<Set<string>>(new Set());

  const { data: locationsData } = useLocations(token);
  const allLocations = useMemo(
    () => (locationsData?.data ?? []).filter((l) => l.isActive),
    [locationsData],
  );

  useEffect(() => {
    if (allLocations.length > 0 && enabledLocationIds.size === 0) {
      setEnabledLocationIds(new Set(allLocations.map((l) => l.id)));
    }
  }, [allLocations]); // Preserve original initialization behavior.

  const toggleLocation = (id: string) => {
    setEnabledLocationIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllLocations = () => {
    if (enabledLocationIds.size === allLocations.length) {
      setEnabledLocationIds(new Set());
    } else {
      setEnabledLocationIds(new Set(allLocations.map((l) => l.id)));
    }
  };

  const showCost = ["ADMIN", "MANAGER"].includes(userRole);
  const createMutation = useCreateProduct(token, locationId);

  const { data: categoriesData } = useCategories(token, locationId, { activeOnly: true });
  const allCategories = categoriesData?.data ?? [];
  const { data: brandsData } = useBrands(token, locationId);
  const brandsList = brandsData?.data ?? [];

  const createBrandMut = useCreateBrand(token, locationId);
  const createCategoryMut = useCreateCategory(token, locationId);

  const handleCategoryChange = (id: string) => {
    setCategoryId(id);
  };

  const quickAddCategory = async (name: string) => {
    const res: any = await createCategoryMut.mutateAsync({
      name,
      slug: slugify(name),
    });
    return { id: res?.data?.id ?? res?.id ?? "" };
  };

  const quickAddBrand = async (name: string) => {
    const res: any = await createBrandMut.mutateAsync({ name, slug: slugify(name) });
    return { id: res?.data?.id ?? res?.id ?? "" };
  };

  const handleGenerateSku = () => {
    setSku(generateSku(name));
  };

  const handleGenerateBarcode = () => {
    setBarcode(generateEan13Barcode());
  };

  const isValid = name.trim() !== "" && sku.trim() !== "";

  const handleSave = async (openFull = false) => {
    if (!isValid) return;
    setError(null);
    try {
      const payload: any = {
        name: name.trim(),
        sku: sku.trim(),
        category: "SCHOOL_SUPPLIES",
        categoryId: categoryId || undefined,
        brandId: brandId || undefined,
        unitPrice: unitPrice || "0.00",
        costPrice: showCost ? (costPrice || "0.00") : "0.00",
        barcode: barcode.trim() || undefined,
        trackInventory,
        initialStock: trackInventory ? parseInt(initialStock, 10) || 0 : 0,
        reorderPoint: 10,
        leadTimeDays: 7,
      };

      if (isAllLocations && enabledLocationIds.size > 0) {
        payload.locationIds = Array.from(enabledLocationIds);
      }

      const result = await createMutation.mutateAsync(payload);
      const createdProduct = (result as any)?.data ?? result;
      const createdId = createdProduct?.id;
      if (openFull) {
        if (createdId) {
          window.location.href = `/inventory/${createdId}/edit`;
        } else {
          setError("Item was saved, but the full setup page could not be opened.");
        }
      } else {
        onClose();
      }
    } catch (err: any) {
      setError(getApiErrorMessage(err));
    }
  };

  return {
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
  };
}
