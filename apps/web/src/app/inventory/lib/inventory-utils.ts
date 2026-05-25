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

/** Extract variant descriptor from product name. */
function getVariantDescriptor(name: string): string {
  return name;
}

export { PAGE_SIZES, DEFAULT_PAGE_SIZE, getStockStatus, getMarginPercent, formatPrice, getVariantDescriptor };
export type { StockStatus };
