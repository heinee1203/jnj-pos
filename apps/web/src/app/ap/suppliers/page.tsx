"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Landmark,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Truck,
  X,
} from "lucide-react";
import { useAuth } from "@/app/auth-context";
import { apiFetch } from "@/lib/api";
import { fmtPeso } from "@/lib/format";
import { cn } from "@/lib/utils";

type RiskSeverity = "info" | "warning" | "critical";
type BankVerificationStatus = "missing" | "unverified" | "verified" | "needs_review";

interface SupplierRiskBadge {
  code: string;
  label: string;
  severity: RiskSeverity;
}

interface SupplierSafety {
  score: number;
  isComplete: boolean;
  paymentReady: boolean;
  missingFields?: Array<{ key: string; label: string }>;
}

interface SupplierRow {
  id: string;
  name: string;
  contactPerson: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  address: string | null;
  tin: string | null;
  mnemonicCode: string | null;
  paymentTermsDays: number | null;
  creditLimit: number | string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  openCount: number;
  totalPayable: number | string | null;
  overdueCount: number;
  overdueAmount: number | string | null;
  oldestOverdueDate: string | null;
  safety?: SupplierSafety;
  riskBadges?: SupplierRiskBadge[];
  bankVerificationStatus?: BankVerificationStatus;
}

interface SupplierFormState {
  name: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
  tin: string;
  mnemonicCode: string;
  paymentTermsDays: string;
  creditLimit: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  notes: string;
  isActive: boolean;
}

const EMPTY_FORM: SupplierFormState = {
  name: "",
  contactPerson: "",
  contactPhone: "",
  contactEmail: "",
  address: "",
  tin: "",
  mnemonicCode: "",
  paymentTermsDays: "30",
  creditLimit: "0.00",
  bankName: "",
  bankAccountNumber: "",
  bankAccountName: "",
  notes: "",
  isActive: true,
};

function amount(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number.parseFloat(String(value ?? "0"));
  return Number.isFinite(parsed) ? parsed : 0;
}

function field(value: string | null | undefined) {
  return value?.trim() || "";
}

function nullable(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function termsLabel(days: number | null | undefined) {
  if (days == null) return "No terms";
  if (days === 0) return "COD";
  if (days === 1) return "Net 1 day";
  return `Net ${days} days`;
}

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

function isPaymentReady(supplier: SupplierRow) {
  if (supplier.safety) return supplier.safety.paymentReady;
  return Boolean(
    field(supplier.bankName)
      && field(supplier.bankAccountName)
      && field(supplier.bankAccountNumber),
  );
}

function paymentStatus(supplier: SupplierRow) {
  const status = supplier.bankVerificationStatus;
  if (!isPaymentReady(supplier) || status === "missing") {
    return { label: "Missing bank", tone: "danger" as const };
  }
  if (status === "verified") return { label: "Verified", tone: "success" as const };
  if (status === "needs_review") return { label: "Needs review", tone: "danger" as const };
  return { label: "Ready", tone: "warning" as const };
}

function formFromSupplier(supplier: SupplierRow | null): SupplierFormState {
  if (!supplier) return EMPTY_FORM;
  return {
    name: supplier.name,
    contactPerson: field(supplier.contactPerson),
    contactPhone: field(supplier.contactPhone),
    contactEmail: field(supplier.contactEmail),
    address: field(supplier.address),
    tin: field(supplier.tin),
    mnemonicCode: field(supplier.mnemonicCode),
    paymentTermsDays: String(supplier.paymentTermsDays ?? 30),
    creditLimit: amount(supplier.creditLimit).toFixed(2),
    bankName: field(supplier.bankName),
    bankAccountNumber: field(supplier.bankAccountNumber),
    bankAccountName: field(supplier.bankAccountName),
    notes: field(supplier.notes),
    isActive: supplier.isActive,
  };
}

function MetricCard({
  label,
  value,
  subtext,
  tone = "default",
}: {
  label: string;
  value: string;
  subtext: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 text-2xl font-bold text-slate-950",
          tone === "success" && "text-emerald-700",
          tone === "warning" && "text-amber-700",
          tone === "danger" && "text-red-700",
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-sm text-slate-500">{subtext}</p>
    </div>
  );
}

function RiskBadge({ badge }: { badge: SupplierRiskBadge }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        badge.severity === "critical" && "bg-red-50 text-red-700",
        badge.severity === "warning" && "bg-amber-50 text-amber-700",
        badge.severity === "info" && "bg-blue-50 text-blue-700",
      )}
    >
      {badge.label}
    </span>
  );
}

function SupplierFormModal({
  supplier,
  token,
  locationId,
  onClose,
  onSaved,
}: {
  supplier: SupplierRow | null;
  token: string;
  locationId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(() => formFromSupplier(supplier));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditing = Boolean(supplier);

  const update = (key: keyof SupplierFormState, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const paymentTermsDays = Number.parseInt(form.paymentTermsDays || "0", 10);
    if (!form.name.trim()) {
      setError("Supplier name is required.");
      return;
    }
    if (!Number.isFinite(paymentTermsDays) || paymentTermsDays < 0) {
      setError("Payment terms must be zero or more days.");
      return;
    }

    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        contactPerson: nullable(form.contactPerson),
        contactPhone: nullable(form.contactPhone),
        contactEmail: nullable(form.contactEmail),
        address: nullable(form.address),
        tin: nullable(form.tin),
        mnemonicCode: nullable(form.mnemonicCode),
        paymentTermsDays,
        creditLimit: (form.creditLimit || "0.00").replace(/,/g, ""),
        bankName: nullable(form.bankName),
        bankAccountNumber: nullable(form.bankAccountNumber),
        bankAccountName: nullable(form.bankAccountName),
        notes: nullable(form.notes),
        ...(isEditing ? { isActive: form.isActive } : {}),
      };

      await apiFetch(
        isEditing ? `/ap/suppliers/${supplier!.id}` : "/ap/suppliers",
        {
          method: isEditing ? "PATCH" : "POST",
          token,
          locationId,
          body,
        },
      );
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save supplier.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/45 px-4 py-6" role="dialog" aria-modal="true">
      <div className="mx-auto flex max-h-full w-full max-w-4xl flex-col rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">
              {isEditing ? "Edit Supplier" : "Add Supplier"}
            </h2>
            <p className="text-sm text-slate-500">
              Maintain vendor contact, terms, and payment profile details.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close supplier form"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5 md:col-span-2">
              <span className="text-sm font-semibold text-slate-700">Supplier Name *</span>
              <input
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="e.g. Quickbrown School Supplies"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-slate-700">Contact Person</span>
              <input
                value={form.contactPerson}
                onChange={(event) => update("contactPerson", event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-slate-700">Mnemonic Code</span>
              <input
                value={form.mnemonicCode}
                onChange={(event) => update("mnemonicCode", event.target.value.toUpperCase())}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm uppercase outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="QUICKBROWN"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-slate-700">Phone</span>
              <input
                value={form.contactPhone}
                onChange={(event) => update("contactPhone", event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-slate-700">Email</span>
              <input
                type="email"
                value={form.contactEmail}
                onChange={(event) => update("contactEmail", event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="space-y-1.5 md:col-span-2">
              <span className="text-sm font-semibold text-slate-700">Address</span>
              <input
                value={form.address}
                onChange={(event) => update("address", event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-slate-700">TIN</span>
              <input
                value={form.tin}
                onChange={(event) => update("tin", event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-slate-700">Payment Terms Days</span>
              <input
                type="number"
                min="0"
                value={form.paymentTermsDays}
                onChange={(event) => update("paymentTermsDays", event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-slate-700">Credit Limit</span>
              <input
                inputMode="decimal"
                value={form.creditLimit}
                onChange={(event) => update("creditLimit", event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-slate-700">Bank Name</span>
              <input
                value={form.bankName}
                onChange={(event) => update("bankName", event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-slate-700">Bank Account Number</span>
              <input
                value={form.bankAccountNumber}
                onChange={(event) => update("bankAccountNumber", event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-slate-700">Bank Account Name</span>
              <input
                value={form.bankAccountName}
                onChange={(event) => update("bankAccountName", event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="space-y-1.5 md:col-span-2">
              <span className="text-sm font-semibold text-slate-700">Notes</span>
              <textarea
                value={form.notes}
                onChange={(event) => update("notes", event.target.value)}
                className="min-h-[90px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            {isEditing && (
              <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => update("isActive", event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                Active supplier
              </label>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Save Supplier
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SuppliersPage() {
  const { token, locationId, loading: authLoading } = useAuth();
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [missingPaymentOnly, setMissingPaymentOnly] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierRow | null | "new">(null);

  const fetchSuppliers = useCallback(async () => {
    if (!token || !locationId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ data: SupplierRow[] }>("/ap/suppliers", { token, locationId });
      setSuppliers(res.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load suppliers.");
    } finally {
      setLoading(false);
    }
  }, [token, locationId]);

  useEffect(() => {
    if (!authLoading && token && locationId) {
      fetchSuppliers();
    }
  }, [authLoading, token, locationId, fetchSuppliers]);

  const filteredSuppliers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return suppliers.filter((supplier) => {
      if (!includeInactive && !supplier.isActive) return false;
      if (overdueOnly && supplier.overdueCount <= 0) return false;
      if (missingPaymentOnly && isPaymentReady(supplier)) return false;
      if (!q) return true;
      return [
        supplier.name,
        supplier.mnemonicCode,
        supplier.contactPerson,
        supplier.contactPhone,
        supplier.contactEmail,
        supplier.tin,
        supplier.bankName,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [suppliers, includeInactive, missingPaymentOnly, overdueOnly, search]);

  const summary = useMemo(() => {
    const activeCount = suppliers.filter((supplier) => supplier.isActive).length;
    const readyCount = suppliers.filter(isPaymentReady).length;
    const payable = suppliers.reduce((sum, supplier) => sum + amount(supplier.totalPayable), 0);
    const overdue = suppliers.reduce((sum, supplier) => sum + amount(supplier.overdueAmount), 0);
    return { activeCount, readyCount, payable, overdue };
  }, [suppliers]);

  const modalSupplier = editingSupplier === "new" ? null : editingSupplier;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-700 text-white shadow-sm">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Accounts Payable
              </p>
              <h1 className="mt-1 text-3xl font-bold text-slate-950">Suppliers</h1>
              <p className="mt-1 text-sm text-slate-500">
                Manage vendor contacts, payment terms, bank profiles, and payable balances.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={fetchSuppliers}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setEditingSupplier("new")}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800"
            >
              <Plus className="h-4 w-4" />
              Add Supplier
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Total" value={String(suppliers.length)} subtext="Supplier records" />
        <MetricCard label="Active" value={String(summary.activeCount)} subtext="Currently usable" tone="success" />
        <MetricCard label="Payment Ready" value={String(summary.readyCount)} subtext="With bank profile" tone="success" />
        <MetricCard label="Open Payable" value={fmtPeso(summary.payable)} subtext="Unsettled invoices" />
        <MetricCard label="Overdue" value={fmtPeso(summary.overdue)} subtext="Past due balance" tone={summary.overdue > 0 ? "danger" : "default"} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search suppliers, code, contact, TIN..."
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={includeInactive}
                  onChange={(event) => setIncludeInactive(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-700"
                />
                Include inactive
              </label>
              <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={overdueOnly}
                  onChange={(event) => setOverdueOnly(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-700"
                />
                Overdue only
              </label>
              <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={missingPaymentOnly}
                  onChange={(event) => setMissingPaymentOnly(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-700"
                />
                Missing bank
              </label>
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-5 mt-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
            <div>
              <p className="font-semibold">Could not load suppliers</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-[1120px] w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-5 py-3">Supplier</th>
                <th className="px-5 py-3">Contact</th>
                <th className="px-5 py-3">Terms</th>
                <th className="px-5 py-3">Payment Profile</th>
                <th className="px-5 py-3 text-right">Open Inv.</th>
                <th className="px-5 py-3 text-right">Total Payable</th>
                <th className="px-5 py-3 text-right">Overdue</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={8} className="px-5 py-14 text-center text-slate-500">
                    <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-blue-700" />
                    Loading suppliers...
                  </td>
                </tr>
              )}

              {!loading && filteredSuppliers.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-14 text-center text-slate-500">
                    No suppliers found.
                  </td>
                </tr>
              )}

              {!loading && filteredSuppliers.map((supplier) => {
                const status = paymentStatus(supplier);
                const overdueAmount = amount(supplier.overdueAmount);
                const badges = supplier.riskBadges?.slice(0, 2) ?? [];

                return (
                  <tr key={supplier.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4 align-top">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                          <Truck className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-950">{supplier.name}</p>
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                supplier.isActive
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-slate-100 text-slate-500",
                              )}
                            >
                              {supplier.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            {supplier.mnemonicCode || "No mnemonic"} {supplier.tin ? `- TIN ${supplier.tin}` : ""}
                          </p>
                          {badges.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {badges.map((badge) => <RiskBadge key={`${supplier.id}-${badge.code}`} badge={badge} />)}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <p className="font-medium text-slate-900">{supplier.contactPerson || "No contact person"}</p>
                      <div className="mt-1 space-y-1 text-xs text-slate-500">
                        <p>{supplier.contactPhone || "No phone"}</p>
                        {supplier.contactEmail && (
                          <p className="inline-flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" />
                            {supplier.contactEmail}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <p className="font-semibold text-slate-900">{termsLabel(supplier.paymentTermsDays)}</p>
                      <p className="mt-1 text-xs text-slate-500">Credit {fmtPeso(amount(supplier.creditLimit))}</p>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                          status.tone === "success" && "bg-emerald-50 text-emerald-700",
                          status.tone === "warning" && "bg-amber-50 text-amber-700",
                          status.tone === "danger" && "bg-red-50 text-red-700",
                        )}
                      >
                        {status.tone === "success" ? <ShieldCheck className="h-3.5 w-3.5" /> : <Landmark className="h-3.5 w-3.5" />}
                        {status.label}
                      </span>
                      <p className="mt-1 text-xs text-slate-500">{supplier.bankName || "No bank on file"}</p>
                    </td>
                    <td className="px-5 py-4 text-right align-top font-semibold text-slate-900">
                      {supplier.openCount}
                    </td>
                    <td className="px-5 py-4 text-right align-top font-semibold text-slate-900">
                      {fmtPeso(amount(supplier.totalPayable))}
                    </td>
                    <td className="px-5 py-4 text-right align-top">
                      <p className={cn("font-semibold", overdueAmount > 0 ? "text-red-700" : "text-slate-900")}>
                        {fmtPeso(overdueAmount)}
                      </p>
                      {supplier.overdueCount > 0 && (
                        <p className="mt-1 text-xs text-slate-500">
                          {supplier.overdueCount} overdue, oldest {formatDate(supplier.oldestOverdueDate)}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right align-top">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          href={`/ap/invoices?supplierId=${supplier.id}`}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Invoices
                        </Link>
                        <button
                          type="button"
                          onClick={() => setEditingSupplier(supplier)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {editingSupplier !== null && token && locationId && (
        <SupplierFormModal
          supplier={modalSupplier}
          token={token}
          locationId={locationId}
          onClose={() => setEditingSupplier(null)}
          onSaved={fetchSuppliers}
        />
      )}
    </div>
  );
}
