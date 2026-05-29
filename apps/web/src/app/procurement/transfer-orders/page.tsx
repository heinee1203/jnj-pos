"use client";

import Link from "next/link";
import { ArrowRight, ArrowRightLeft, Plus } from "lucide-react";
import { useAuth } from "@/app/auth-context";
import { useTransfersList, type TransferListItem } from "@/hooks/use-transfers-list";

function statusClass(status: string) {
  if (status === "RECEIVED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "CANCELLED") return "border-slate-200 bg-slate-50 text-slate-500";
  if (status === "CLOSED_WITH_VARIANCE") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "DISPATCHED" || status === "PARTIALLY_RECEIVED") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  return "border-slate-200 bg-white text-slate-700";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function TransferRow({ transfer }: { transfer: TransferListItem }) {
  return (
    <Link
      href={`/procurement/transfer-orders/${transfer.transferNo}`}
      className="grid grid-cols-[1fr_1.4fr_140px_110px] items-center gap-4 border-t px-4 py-3 text-sm transition hover:bg-slate-50"
    >
      <div>
        <div className="font-semibold text-slate-950">{transfer.transferNo}</div>
        <div className="text-xs text-muted-foreground">{formatDate(transfer.createdAt)}</div>
      </div>
      <div className="flex min-w-0 items-center gap-2 text-slate-700">
        <span className="truncate">{transfer.sourceLocationName}</span>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{transfer.destinationLocationName}</span>
      </div>
      <div>
        <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${statusClass(transfer.status)}`}>
          {transfer.status.replace(/_/g, " ")}
        </span>
      </div>
      <div className="text-right text-muted-foreground">{transfer.lineCount ?? 0} lines</div>
    </Link>
  );
}

export default function TransferOrdersPage() {
  const { token, apiLocationId, loading } = useAuth();
  const transfersQuery = useTransfersList(token, apiLocationId);
  const transfers = transfersQuery.data?.data ?? [];

  if (loading) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Inventory Movement
              </div>
              <h1 className="text-xl font-semibold text-slate-950">Transfer Orders</h1>
              <p className="text-sm text-muted-foreground">
                Move stock warehouse to store, store to store, or store to warehouse.
              </p>
            </div>
          </div>
          <Link
            href="/procurement/transfer-orders/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Transfer
          </Link>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <div className="grid grid-cols-[1fr_1.4fr_140px_110px] gap-4 border-b bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <div>Transfer</div>
          <div>Route</div>
          <div>Status</div>
          <div className="text-right">Lines</div>
        </div>
        {transfersQuery.isLoading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Loading transfer orders...</div>
        ) : transfersQuery.isError ? (
          <div className="py-16 text-center text-sm text-destructive">Could not load transfer orders.</div>
        ) : transfers.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">No transfer orders yet.</div>
        ) : (
          transfers.map((transfer) => (
            <TransferRow key={transfer.id} transfer={transfer} />
          ))
        )}
      </section>
    </div>
  );
}
