export type PriceChangeSource = "manual" | "bulk_update" | "import" | "margin_alert" | "dead_stock_clearance" | "po_received";

/**
 * Log a price change. Fire-and-forget — currently a no-op since
 * the price_changes table has been removed from the schema.
 */
export function logPriceChange(_params: {
  orgId: string;
  productId: string;
  field: "SELL_PRICE" | "COST_PRICE";
  oldValue: number;
  newValue: number;
  reason?: string;
  source?: PriceChangeSource;
  changedBy?: string;
  batchId?: string;
}): void {
  // No-op: price_changes table removed
}
