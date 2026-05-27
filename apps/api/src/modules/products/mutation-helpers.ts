import { MANAGE_ROLES } from "./permissions";

export type ProductMutationAction = "create" | "delete" | "update";

export function getProductMutationPermissionError(
  action: ProductMutationAction,
  role: string | null | undefined,
) {
  if (MANAGE_ROLES.includes(role ?? "")) return null;
  return `Only ADMIN or MANAGER can ${action} products`;
}

export function requiresSkuForProduct(hasVariants: boolean, sku: string | null | undefined) {
  return !hasVariants && (!sku || sku.length === 0);
}

export function hasDuplicateSkus(skus: string[]) {
  return new Set(skus).size !== skus.length;
}

export function resolveInventoryTargetLocationIds(
  locationIds: string[] | null | undefined,
  fallbackLocationId: string | null | undefined,
) {
  return locationIds && locationIds.length > 0
    ? locationIds
    : fallbackLocationId ? [fallbackLocationId] : [];
}

export function buildVariantProductName(parentName: string, suffix: string) {
  return `${parentName} — ${suffix}`;
}

export function splitProductUpdatePayload<T extends Record<string, any>>(updates: T) {
  const {
    reorderPoint,
    newVariants,
    priceTiers,
    conversionFactor: rawConversionFactor,
    ...productUpdates
  } = updates;
  if (rawConversionFactor !== undefined) {
    (productUpdates as Record<string, any>).conversionFactor = String(rawConversionFactor);
  }

  const result: {
    newVariants?: typeof newVariants;
    priceTiers?: typeof priceTiers;
    productUpdates: typeof productUpdates;
    reorderPoint: typeof reorderPoint;
  } = {
    productUpdates,
    reorderPoint,
  };

  if (newVariants !== undefined) result.newVariants = newVariants;
  if (priceTiers !== undefined) result.priceTiers = priceTiers;

  return result;
}

export function isValidProductId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
