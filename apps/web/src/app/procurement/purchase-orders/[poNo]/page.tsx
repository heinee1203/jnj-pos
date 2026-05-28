"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/app/auth-context";
import { apiFetch } from "@/lib/api";
import { fmtPeso } from "@/lib/format";
import { usePOQuery, type PODetail } from "@/hooks/use-po-query";

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

function lineUnit(line: PODetail["lines"][number]) {
  return (line.unit || "PCS").toUpperCase();
}

export default function PurchaseOrderDetailPage() {
  const params = useParams<{ poNo: string }>();
  const poNo = decodeURIComponent(params?.poNo ?? "");
  const { token, apiLocationId, locationId, loading } = useAuth();
  const resolvedLocationId = apiLocationId || locationId;
  const poQuery = usePOQuery(poNo, token, resolvedLocationId);
  const [receiveOpen, setReceiveOpen] = useState(false);

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
          <div className="flex items-center gap-2">
            {["SUBMITTED", "PARTIALLY_RECEIVED"].includes(po.status) && (
              <button
                type="button"
                onClick={() => setReceiveOpen(true)}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Receive Inventory
              </button>
            )}
            <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              {statusLabel(po.status)}
            </span>
          </div>
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
                  <td className="px-4 py-3 text-right font-mono">
                    {line.orderedQty} {lineUnit(line)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {line.receivedAcceptedQty} {lineUnit(line)}
                  </td>
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

      {receiveOpen && (
        <ReceiveInventoryModal
          locationId={resolvedLocationId}
          po={po}
          token={token}
          onClose={() => setReceiveOpen(false)}
          onReceived={async () => {
            setReceiveOpen(false);
            toast.success("Inventory received successfully");
            await poQuery.refetch();
          }}
        />
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

function ReceiveInventoryModal({
  po,
  token,
  locationId,
  onClose,
  onReceived,
}: {
  po: PODetail;
  token: string;
  locationId: string;
  onClose: () => void;
  onReceived: () => void | Promise<void>;
}) {
  const [supplierDrNo, setSupplierDrNo] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState(() =>
    po.lines.map((line) => ({
      poLineId: line.id,
      accepted: Math.max(0, line.orderedQty - line.receivedAcceptedQty - line.rejectedQty),
      rejected: 0,
      unitCost: line.unitCost,
      notes: "",
    })),
  );

  useEffect(() => {
    setRows(
      po.lines.map((line) => ({
        poLineId: line.id,
        accepted: Math.max(0, line.orderedQty - line.receivedAcceptedQty - line.rejectedQty),
        rejected: 0,
        unitCost: line.unitCost,
        notes: "",
      })),
    );
  }, [po.lines]);

  const updateRow = (poLineId: string, field: "accepted" | "rejected" | "unitCost" | "notes", value: string) => {
    setRows((current) =>
      current.map((row) =>
        row.poLineId === poLineId
          ? {
              ...row,
              [field]: field === "accepted" || field === "rejected"
                ? Math.max(0, parseInt(value, 10) || 0)
                : value,
            }
          : row,
      ),
    );
  };

  const submit = async () => {
    setError(null);
    if (!supplierDrNo.trim()) {
      setError("Supplier DR number is required.");
      return;
    }

    const lines = rows
      .filter((row) => row.accepted + row.rejected > 0)
      .map((row) => ({
        poLineId: row.poLineId,
        receivedAcceptedQty: row.accepted,
        rejectedQty: row.rejected,
        unitCost: row.unitCost || "0.00",
        notes: row.notes.trim() || undefined,
      }));

    if (lines.length === 0) {
      setError("Enter at least one accepted or rejected quantity.");
      return;
    }

    setSaving(true);
    try {
      await apiFetch(`/procurement/purchase-orders/${po.id}/receive`, {
        method: "POST",
        token,
        locationId,
        body: JSON.stringify({
          idempotencyKey: crypto.randomUUID(),
          supplierDrNo: supplierDrNo.trim(),
          lines,
          notes: notes.trim() || undefined,
        }),
      });
      await onReceived();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to receive inventory.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/45 p-4" role="dialog" aria-modal="true">
      <div className="mx-auto flex max-h-full w-full max-w-5xl flex-col rounded-lg bg-background shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">Receive Inventory</h2>
            <p className="text-sm text-muted-foreground">{po.poNo} · quantities are in PO units</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted">
            Close
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-5">
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Supplier DR / Invoice No.</span>
              <input
                value={supplierDrNo}
                onChange={(event) => setSupplierDrNo(event.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Notes</span>
              <input
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
            </label>
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Item</th>
                  <th className="px-3 py-2 text-right">Remaining</th>
                  <th className="px-3 py-2 text-right">Accepted</th>
                  <th className="px-3 py-2 text-right">Rejected</th>
                  <th className="px-3 py-2 text-right">Unit Cost</th>
                  <th className="px-3 py-2 text-left">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {po.lines.map((line) => {
                  const row = rows.find((item) => item.poLineId === line.id)!;
                  const remaining = Math.max(0, line.orderedQty - line.receivedAcceptedQty - line.rejectedQty);
                  const unit = lineUnit(line);
                  return (
                    <tr key={line.id}>
                      <td className="px-3 py-2">
                        <div className="font-medium">{line.productName}</div>
                        <div className="text-xs text-muted-foreground">{line.sku}</div>
                      </td>
                      <td className="px-3 py-2 text-right font-mono">{remaining} {unit}</td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min={0}
                          max={remaining}
                          value={row.accepted}
                          onChange={(event) => updateRow(line.id, "accepted", event.target.value)}
                          className="h-9 w-24 rounded-md border border-border bg-background px-2 text-right font-mono outline-none focus:border-primary"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min={0}
                          max={remaining}
                          value={row.rejected}
                          onChange={(event) => updateRow(line.id, "rejected", event.target.value)}
                          className="h-9 w-24 rounded-md border border-border bg-background px-2 text-right font-mono outline-none focus:border-primary"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          value={row.unitCost}
                          onChange={(event) => updateRow(line.id, "unitCost", event.target.value)}
                          className="h-9 w-28 rounded-md border border-border bg-background px-2 text-right font-mono outline-none focus:border-primary"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={row.notes}
                          onChange={(event) => updateRow(line.id, "notes", event.target.value)}
                          className="h-9 w-full rounded-md border border-border bg-background px-2 outline-none focus:border-primary"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Receiving..." : "Receive Inventory"}
          </button>
        </div>
      </div>
    </div>
  );
}
