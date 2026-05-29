"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2, PackageCheck } from "lucide-react";
import { useAuth } from "@/app/auth-context";
import {
  useApproveMutation,
  useCancelMutation,
  useDispatchMutation,
  useReceiveMutation,
  useStartPickingMutation,
  useVarianceMutation,
} from "@/hooks/use-transfer-mutations";
import { useTransferQuery, type TransferDetail } from "@/hooks/use-transfer-query";

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

function statusClass(status: string) {
  if (status === "RECEIVED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "CANCELLED") return "border-slate-200 bg-slate-50 text-slate-500";
  if (status === "CLOSED_WITH_VARIANCE") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 text-lg font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function ActionStatus({
  messages,
}: {
  messages: Array<string | null>;
}) {
  const message = messages.find(Boolean);
  if (!message) return null;
  return (
    <div className="rounded-lg border bg-slate-50 px-4 py-3 text-sm text-slate-700">
      {message}
    </div>
  );
}

function QtyActionPanel({
  title,
  transfer,
  kind,
  values,
  onChange,
  onSubmit,
  disabled,
}: {
  title: string;
  transfer: TransferDetail;
  kind: "dispatch" | "receive" | "variance";
  values: Record<string, number>;
  onChange: (lineId: string, qty: number) => void;
  onSubmit: () => void;
  disabled: boolean;
}) {
  const remainingKey: "remainingDispatchable" | "remainingReceivable" =
    kind === "dispatch" ? "remainingDispatchable" : "remainingReceivable";
  const rows = transfer.items.filter((item) => item[remainingKey] > 0);
  if (rows.length === 0) return null;

  return (
    <section className="rounded-lg border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">
            Quantities are entered in the transfer UOM.
          </p>
        </div>
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {title}
        </button>
      </div>
      <div className="divide-y">
        {rows.map((item) => (
          <div key={item.id} className="grid grid-cols-[1fr_160px_170px] items-center gap-4 px-5 py-3 text-sm">
            <div className="min-w-0">
              <div className="truncate font-semibold text-slate-950">{item.productName}</div>
              <div className="text-xs text-muted-foreground">{item.sku}</div>
            </div>
            <div className="text-muted-foreground">
              Remaining: <span className="font-semibold text-slate-800">{item[remainingKey]} {item.unit}</span>
            </div>
            <input
              type="number"
              min={0}
              max={item[remainingKey]}
              value={values[item.id] ?? 0}
              onChange={(event) => onChange(item.id, Number.parseInt(event.target.value, 10) || 0)}
              className="h-10 rounded-lg border px-3 text-sm"
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function TransferOrderDetailPage() {
  const params = useParams<{ transferNo: string }>();
  const transferNo = decodeURIComponent(params?.transferNo ?? "");
  const { token, apiLocationId, locationId, loading } = useAuth();
  const resolvedLocationId = apiLocationId || locationId;
  const transferQuery = useTransferQuery(transferNo, token, resolvedLocationId);

  const displayNo = transferQuery.data?.transferNo ?? transferNo;
  const approveMutation = useApproveMutation(token, resolvedLocationId, displayNo);
  const startPickingMutation = useStartPickingMutation(token, resolvedLocationId, displayNo);
  const dispatchMutation = useDispatchMutation(token, resolvedLocationId, displayNo);
  const receiveMutation = useReceiveMutation(token, resolvedLocationId, displayNo);
  const varianceMutation = useVarianceMutation(token, resolvedLocationId, displayNo);
  const cancelMutation = useCancelMutation(token, resolvedLocationId, displayNo);

  const [dispatchQty, setDispatchQty] = useState<Record<string, number>>({});
  const [receiveQty, setReceiveQty] = useState<Record<string, number>>({});
  const [varianceQty, setVarianceQty] = useState<Record<string, number>>({});

  useEffect(() => {
    const transfer = transferQuery.data;
    if (!transfer) return;
    setDispatchQty(
      Object.fromEntries(
        transfer.items.map((item) => [item.id, Math.max(0, item.remainingDispatchable)]),
      ),
    );
    setReceiveQty(
      Object.fromEntries(
        transfer.items.map((item) => [item.id, Math.max(0, item.remainingReceivable)]),
      ),
    );
    setVarianceQty(
      Object.fromEntries(transfer.items.map((item) => [item.id, 0])),
    );
  }, [transferQuery.data?.id, transferQuery.data?.updatedAt]);

  const totals = useMemo(() => {
    const items = transferQuery.data?.items ?? [];
    return {
      requested: items.reduce((sum, item) => sum + item.requestedQty, 0),
      dispatched: items.reduce((sum, item) => sum + item.dispatchedQty, 0),
      received: items.reduce((sum, item) => sum + item.receivedQty, 0),
    };
  }, [transferQuery.data?.items]);

  if (loading || transferQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading transfer order...
      </div>
    );
  }

  if (transferQuery.isError || !transferQuery.data) {
    return (
      <div className="space-y-4 p-4">
        <Link href="/procurement/transfer-orders" className="text-sm text-muted-foreground hover:text-foreground">
          Back to Transfer Orders
        </Link>
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Could not load transfer order {transferNo}.
        </div>
      </div>
    );
  }

  const transfer = transferQuery.data;
  const isBusy =
    approveMutation.isSubmitting ||
    startPickingMutation.isSubmitting ||
    dispatchMutation.isSubmitting ||
    receiveMutation.isSubmitting ||
    varianceMutation.isSubmitting ||
    cancelMutation.isSubmitting;

  const submitDispatch = () => {
    const lines = transfer.items
      .map((item) => ({
        transferItemId: item.id,
        dispatchQty: Math.min(dispatchQty[item.id] ?? 0, item.remainingDispatchable),
      }))
      .filter((line) => line.dispatchQty > 0);
    if (lines.length > 0) dispatchMutation.submit(transfer.id, { lines });
  };

  const submitReceive = () => {
    const lines = transfer.items
      .map((item) => ({
        transferItemId: item.id,
        receiveQty: Math.min(receiveQty[item.id] ?? 0, item.remainingReceivable),
      }))
      .filter((line) => line.receiveQty > 0);
    if (lines.length > 0) receiveMutation.submit(transfer.id, { lines });
  };

  const submitVariance = () => {
    const lines = transfer.items
      .map((item) => ({
        transferItemId: item.id,
        varianceQty: Math.min(varianceQty[item.id] ?? 0, item.remainingReceivable),
        reasonCode: "TRANSFER_SHORTAGE",
      }))
      .filter((line) => line.varianceQty > 0);
    if (lines.length > 0) varianceMutation.submit(transfer.id, { lines });
  };

  return (
    <div className="space-y-5 pb-10">
      <div>
        <Link
          href="/procurement/transfer-orders"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Transfer Orders
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">{transfer.transferNo}</h1>
            <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{transfer.sourceLocation.name}</span>
              <ArrowRight className="h-4 w-4" />
              <span>{transfer.destinationLocation.name}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {transfer.allowedActions.includes("approve") && (
              <button
                type="button"
                onClick={() => approveMutation.submit(transfer.id, {})}
                disabled={isBusy}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                Approve
              </button>
            )}
            {transfer.allowedActions.includes("start-picking") && (
              <button
                type="button"
                onClick={() => startPickingMutation.submit(transfer.id, {})}
                disabled={isBusy}
                className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
              >
                Start Picking
              </button>
            )}
            {transfer.allowedActions.includes("cancel") && (
              <button
                type="button"
                onClick={() => cancelMutation.submit(transfer.id, {})}
                disabled={isBusy}
                className="rounded-lg border px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/5 disabled:opacity-50"
              >
                Cancel
              </button>
            )}
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusClass(transfer.status)}`}>
              {transfer.status.replace(/_/g, " ")}
            </span>
          </div>
        </div>
      </div>

      <ActionStatus
        messages={[
          approveMutation.statusMessage,
          startPickingMutation.statusMessage,
          dispatchMutation.statusMessage,
          receiveMutation.statusMessage,
          varianceMutation.statusMessage,
          cancelMutation.statusMessage,
        ]}
      />

      <section className="grid gap-3 md:grid-cols-4">
        <SummaryCard label="Created" value={formatDate(transfer.createdAt)} />
        <SummaryCard label="Requested" value={totals.requested} />
        <SummaryCard label="Dispatched" value={totals.dispatched} />
        <SummaryCard label="Received" value={totals.received} />
      </section>

      <section className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b px-5 py-4">
          <PackageCheck className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold">Line Items</h2>
        </div>
        <div className="grid grid-cols-[1fr_140px_140px_140px_140px] gap-4 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <div>Item</div>
          <div className="text-right">Requested</div>
          <div className="text-right">Dispatched</div>
          <div className="text-right">Received</div>
          <div className="text-right">Remaining</div>
        </div>
        {transfer.items.map((item) => (
          <div key={item.id} className="grid grid-cols-[1fr_140px_140px_140px_140px] gap-4 border-t px-5 py-3 text-sm">
            <div className="min-w-0">
              <div className="truncate font-semibold text-slate-950">{item.productName}</div>
              <div className="text-xs text-muted-foreground">
                {item.sku} - 1 {item.unit} = {Number(item.conversionFactor).toLocaleString()} base units
              </div>
            </div>
            <div className="text-right font-medium">{item.requestedQty} {item.unit}</div>
            <div className="text-right">{item.dispatchedQty} {item.unit}</div>
            <div className="text-right">{item.receivedQty} {item.unit}</div>
            <div className="text-right text-muted-foreground">{item.remainingReceivable} {item.unit}</div>
          </div>
        ))}
      </section>

      {transfer.allowedActions.includes("dispatch") && (
        <QtyActionPanel
          title="Dispatch Stock"
          transfer={transfer}
          kind="dispatch"
          values={dispatchQty}
          onChange={(lineId, qty) => setDispatchQty((current) => ({ ...current, [lineId]: qty }))}
          onSubmit={submitDispatch}
          disabled={isBusy}
        />
      )}

      {transfer.allowedActions.includes("receive") && (
        <QtyActionPanel
          title="Receive Inventory"
          transfer={transfer}
          kind="receive"
          values={receiveQty}
          onChange={(lineId, qty) => setReceiveQty((current) => ({ ...current, [lineId]: qty }))}
          onSubmit={submitReceive}
          disabled={isBusy}
        />
      )}

      {transfer.allowedActions.includes("report-variance") && (
        <QtyActionPanel
          title="Report Variance"
          transfer={transfer}
          kind="variance"
          values={varianceQty}
          onChange={(lineId, qty) => setVarianceQty((current) => ({ ...current, [lineId]: qty }))}
          onSubmit={submitVariance}
          disabled={isBusy}
        />
      )}

      {transfer.notes && (
        <section className="rounded-lg border bg-white p-5 shadow-sm">
          <h2 className="mb-2 font-semibold">Notes</h2>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{transfer.notes}</p>
        </section>
      )}
    </div>
  );
}
