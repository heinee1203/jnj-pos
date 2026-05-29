const PAGE_SIZES = [25, 50, 100, 200, 500] as const;
const DEFAULT_PAGE_SIZE = 50;

type StockStatus = "in-stock" | "low" | "out";

function getStockStatus(stockLevel: number, reorderPoint: number): StockStatus {
  if (stockLevel === 0) return "out";
  if (stockLevel <= reorderPoint) return "low";
  return "in-stock";
}

function getMarginPercent(sell: number, cost: number): { value: number; display: string } {
  if (sell === 0) return { value: 0, display: "\u2014" };
  const margin = ((sell - cost) / sell) * 100;
  return { value: margin, display: `${margin.toFixed(1)}%` };
}

function formatPrice(amount: number): string {
  return amount.toLocaleString("en-PH", { minimumFractionDigits: 2 });
}

type VariantOptionDisplay = {
  typeName?: string | null;
  value?: string | null;
};

function getVariantOptionLabel(options?: VariantOptionDisplay[], separator = " / "): string {
  return (options ?? [])
    .map((option) => option.value?.trim())
    .filter((value): value is string => !!value)
    .join(separator);
}

/** Extract the distinguishing part of a variant name for nested variant rows. */
function getVariantDisplayName(
  name: string | null | undefined,
  options?: VariantOptionDisplay[],
  parentName?: string | null,
): string {
  const optionLabel = getVariantOptionLabel(options);
  if (optionLabel) return optionLabel;

  const trimmedName = name?.trim() ?? "";
  const trimmedParent = parentName?.trim() ?? "";
  if (trimmedName && trimmedParent && trimmedName.toLowerCase().startsWith(trimmedParent.toLowerCase())) {
    const suffix = trimmedName
      .slice(trimmedParent.length)
      .replace(/^[\s\u2013\u2014\-:|/]+/, "")
      .trim();
    if (suffix) return suffix;
  }

  return trimmedName;
}

export {
  PAGE_SIZES,
  DEFAULT_PAGE_SIZE,
  getStockStatus,
  getMarginPercent,
  formatPrice,
  getVariantOptionLabel,
  getVariantDisplayName,
};
export type { StockStatus };
