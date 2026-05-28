export type StockPackageContext = {
  factor: number;
  packageUnit: string;
  sellingUnit: string;
};

export type StockDisplay = {
  primary: string;
  secondary: string | null;
};

export function normalizeUnit(unit: string | null | undefined, fallback: string) {
  return (unit || fallback).trim().toUpperCase();
}

export function stockPackageContext({
  conversionFactor,
  packagingUnit,
  purchaseUnit,
  sellingUnit,
  unitsPerCase,
}: {
  conversionFactor?: string | number | null;
  packagingUnit?: string | null;
  purchaseUnit?: string | null;
  sellingUnit?: string | null;
  unitsPerCase?: number;
}): StockPackageContext {
  const parsedFactor = Number(conversionFactor);
  const factor = Number.isFinite(parsedFactor) && parsedFactor > 1
    ? parsedFactor
    : unitsPerCase && unitsPerCase > 1
      ? unitsPerCase
      : 1;

  return {
    factor,
    packageUnit: normalizeUnit(purchaseUnit || packagingUnit, "CASE"),
    sellingUnit: normalizeUnit(sellingUnit, "PCS"),
  };
}

export function formatWarehouseStock(
  stockLevel: number,
  context: StockPackageContext,
): StockDisplay {
  const stock = Math.max(0, Math.floor(stockLevel));
  const factor = Math.max(1, Math.floor(context.factor));
  if (factor <= 1) {
    return {
      primary: `${stock.toLocaleString()} ${context.sellingUnit}`,
      secondary: null,
    };
  }

  const packages = Math.floor(stock / factor);
  const loose = stock % factor;
  return {
    primary: `${packages.toLocaleString()} ${context.packageUnit}`,
    secondary: loose > 0 ? `+ ${loose.toLocaleString()} ${context.sellingUnit}` : null,
  };
}

export function formatPackageSummary(
  stockLevel: number,
  context: StockPackageContext,
) {
  const stock = Math.max(0, Math.floor(stockLevel));
  const factor = Math.max(1, Math.floor(context.factor));
  if (factor <= 1 || stock < factor) return null;

  const packages = Math.floor(stock / factor);
  const loose = stock % factor;
  return `${packages.toLocaleString()} ${context.packageUnit}${loose > 0 ? ` + ${loose.toLocaleString()} ${context.sellingUnit}` : ""}`;
}

export function stockDisplayText(display: StockDisplay) {
  return display.secondary ? `${display.primary} ${display.secondary}` : display.primary;
}

export function formatWarehouseStockText(
  quantity: number,
  context: StockPackageContext,
  { signed = false }: { signed?: boolean } = {},
) {
  const sign = signed && quantity > 0 ? "+" : quantity < 0 ? "-" : "";
  const display = formatWarehouseStock(Math.abs(quantity), context);
  return `${sign}${stockDisplayText(display)}`;
}
