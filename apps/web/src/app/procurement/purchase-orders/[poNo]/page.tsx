"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/app/auth-context";
import { fmtPeso } from "@/lib/format";
import { usePOQuery } from "@/hooks/use-po-query";

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

export default function PurchaseOrderDetailPage() {
  const params = useParams<{ poNo: string }>();
  const poNo = decodeURIComponent(params?.poNo ?? "");
  const { token, apiLocationId, locationId, loading } = useAuth();
  const resolvedLocationId = apiLocationId || locationId;
  const poQuery = usePOQuery(poNo, token, resolvedLocationId);

  if (loading || poQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading purchase order...
      </div>
    );
  }

  if (poQuery.isError || !poQuery.data) {
    return (
      <div className="space-y-4 p-4">
        <Link href="/procurement/purchase-orders" className="text-sm text-muted-foreground hover:text-foreground">
          Back to Purchase Orders
        </Link>
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Could not load purchase order {poNo}.
        </div>
      </div>
    );
  }

  const po = poQuery.data;
  const itemsTotal = po.lines.reduce(
    (sum, line) => sum + line.orderedQty * (parseFloat(line.unitCost) || 0),
    0,
  );
  const receivedCount = po.lines.reduce((sum, line) => sum + line.receivedAcceptedQty, 0);

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <Link href="/procurement/purchase-orders" className="mb-2 inline-flex text-sm text-muted-foreground hover:text-foreground">
          Back to Purchase Orders
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{po.poNo}</h1>
            <p className="text-sm text-muted-foreground">
              {po.supplier?.name ?? "No supplier"} · {po.destination?.name ?? "No destination"}
            </p>
          </div>
          <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            {statusLabel(po.status)}
          </span>
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-4">
        <SummaryCard label="Created" value={formatDate(po.createdAt)} />
        <SummaryCard label="Expected" value={formatDate(po.expectedDeliveryDate)} />
        <SummaryCard label="Lines" value={String(po.lines.length)} />
        <SummaryCard label="Received" value={String(receivedCount)} />
      </section>

      <section className="rounded-lg border border-border bg-background">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Line Items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Item</th>
                <th className="px-4 py-2 text-right">Ordered</th>
                <th className="px-4 py-2 text-right">Received</th>
                <th className="px-4 py-2 text-right">Unit Cost</th>
                <th className="px-4 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {po.lines.map((line) => (
                <tr key={line.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{line.productName}</div>
                    <div className="text-xs text-muted-foreground">{line.sku}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{line.orderedQty}</td>
                  <td className="px-4 py-3 text-right font-mono">{line.receivedAcceptedQty}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmtPeso(parseFloat(line.unitCost) || 0)}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">
                    {fmtPeso(line.orderedQty * (parseFloat(line.unitCost) || 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end border-t border-border bg-muted/20 px-4 py-3 text-sm font-semibold">
          Items Total: {fmtPeso(itemsTotal)}
        </div>
      </section>

      {po.notes && (
        <section className="rounded-lg border border-border bg-background p-4">
          <h2 className="mb-2 text-sm font-semibold">Notes</h2>
          <pre className="whitespace-pre-wrap font-sans text-sm text-muted-foreground">{po.notes}</pre>
        </section>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
