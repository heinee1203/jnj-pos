import { fmtPeso } from "@/lib/format";
import type { POFeeInput } from "../types";

type AdditionalFeesCardProps = {
  fees: POFeeInput[];
  itemsTotal: number;
  feesTotal: number;
  orderTotal: number;
  onAddFee: () => void;
  onRemoveFee: (localId: string) => void;
  onUpdateFee: (localId: string, field: keyof Omit<POFeeInput, "localId">, value: string) => void;
};

export function AdditionalFeesCard({
  fees,
  itemsTotal,
  feesTotal,
  orderTotal,
  onAddFee,
  onRemoveFee,
  onUpdateFee,
}: AdditionalFeesCardProps) {
  return (
    <div className="mb-4 rounded-lg border border-border bg-background p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Additional Fees
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Add freight, handling, delivery, or other purchase charges.
          </p>
        </div>
        <button
          type="button"
          onClick={onAddFee}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
        >
          + Add Fee
        </button>
      </div>

      {fees.length > 0 && (
        <div className="mb-3 space-y-2">
          {fees.map((fee) => (
            <div key={fee.localId} className="grid grid-cols-[1fr_180px_32px] items-center gap-2">
              <input
                value={fee.label}
                onChange={(event) => onUpdateFee(fee.localId, "label", event.target.value)}
                placeholder="Freight, handling, delivery..."
                className="h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
              <input
                inputMode="decimal"
                value={fee.amount}
                onChange={(event) => onUpdateFee(fee.localId, "amount", event.target.value)}
                placeholder="0.00"
                className="h-9 rounded-md border border-border bg-background px-3 text-right font-mono text-sm outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => onRemoveFee(fee.localId)}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label={`Remove ${fee.label || "fee"}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <div className="w-full max-w-sm space-y-1 rounded-md bg-muted/30 px-3 py-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Items subtotal</span>
            <span className="font-mono">{fmtPeso(itemsTotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Additional fees</span>
            <span className="font-mono">{fmtPeso(feesTotal)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-1 font-semibold">
            <span>Order total</span>
            <span className="font-mono">{fmtPeso(orderTotal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
