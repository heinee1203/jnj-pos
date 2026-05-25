"use client";

import { useState, useMemo, useRef } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, Grid3x3, Loader2, Package, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/app/auth-context";
import { useConfirm } from "@/components/confirm-dialog";
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  type CategoryRow,
} from "@/hooks/use-categories";
import { CategorySearchBar } from "./components/category-search-bar";
import { CategoryModal } from "./components/category-modal";
import { DeleteConfirmModal } from "./components/delete-confirm-modal";
import { EMPTY_CATEGORIES } from "./constants";
import { cn } from "@/lib/utils";

/* -----------------------------------------------
 * MAIN PAGE — flat category list
 * ----------------------------------------------- */

export default function CategoriesPage() {
  const { token, locationId, loading: authLoading } = useAuth();
  const confirm = useConfirm();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Modals
  const [modalMode, setModalMode] = useState<"closed" | "create" | "edit">("closed");
  const [editingCategory, setEditingCategory] = useState<CategoryRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CategoryRow | null>(null);

  // Debounce
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(value), 300);
  };

  // Data
  const { data: categoriesData, isLoading, isError } = useCategories(token, locationId, {});
  const createCatMut = useCreateCategory(token, locationId);
  const updateCatMut = useUpdateCategory(token, locationId);
  const deleteCatMut = useDeleteCategory(token, locationId);

  const allCategories = categoriesData?.data ?? EMPTY_CATEGORIES;

  // Filter & sort
  const filtered = useMemo(() => {
    let result = [...allCategories];
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q));
    }
    result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [allCategories, debouncedSearch]);

  const totalCategories = allCategories.length;
  const totalItems = allCategories.reduce((sum, c) => sum + c.productCount, 0);

  function openCreate() {
    setEditingCategory(null);
    setModalMode("create");
  }

  function openEdit(cat: CategoryRow) {
    setEditingCategory(cat);
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode("closed");
    setEditingCategory(null);
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deleteCatMut.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  }

  async function handleRemoveEmpty() {
    const ok = await confirm({
      title: "Remove empty categories?",
      message: "This removes all categories with 0 items. This cannot be undone.",
      confirmLabel: "Remove Empty",
      variant: "danger",
    });
    if (!ok) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/categories/remove-empty`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "X-Location-ID": locationId },
      });
      const data = await res.json();
      toast.success(`Removed ${data.categoriesRemoved} empty categories`);
      window.location.reload();
    } catch (err: any) {
      toast.error("Failed: " + (err.message || "Unknown error"));
    }
  }

  if (authLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col px-2 sm:px-0">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/[0.06]">
                <Grid3x3 size={16} className="text-primary" />
              </div>
              <h1 className="text-[18px] font-semibold tracking-tight text-foreground">
                Categories
              </h1>
            </div>
            <p className="mt-1.5 text-[13px] leading-5 text-muted-foreground">
              Manage product categories
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-[13px] font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]"
          >
            <Plus size={14} strokeWidth={2.5} />
            Add Category
          </button>
        </div>

        <div className="mt-4 flex gap-5">
          <div className="flex items-center gap-2 text-[13px]">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-muted">
              <Grid3x3 size={11} className="text-muted-foreground" />
            </div>
            <span className="text-muted-foreground">Categories</span>
            <span className="font-semibold tabular-nums text-foreground">{totalCategories.toLocaleString()}</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2 text-[13px]">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-muted">
              <Package size={11} className="text-muted-foreground" />
            </div>
            <span className="text-muted-foreground">Items</span>
            <span className="font-semibold tabular-nums text-foreground">{totalItems.toLocaleString()}</span>
          </div>
          <div className="ml-auto">
            <button
              onClick={handleRemoveEmpty}
              className="rounded-md border border-destructive/30 px-3 py-1.5 text-[11px] font-medium text-destructive transition-colors hover:bg-destructive/5"
            >
              Remove Empty
            </button>
          </div>
        </div>
      </div>

      <CategorySearchBar
        value={searchQuery}
        onChange={handleSearchChange}
        onClear={() => {
          setSearchQuery("");
          setDebouncedSearch("");
        }}
      />

      {/* Content */}
      <div className="overflow-hidden rounded-xl border border-border bg-background shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={18} className="animate-spin text-muted-foreground" />
            <span className="ml-2 text-[13px] text-muted-foreground">Loading categories...</span>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertTriangle size={20} className="text-destructive" />
            <p className="mt-2 text-[13px] text-destructive">Failed to load categories</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-[13px] text-muted-foreground">
            {debouncedSearch ? "No categories match your search" : "No categories found"}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((cat) => (
              <div
                key={cat.id}
                className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent/40"
              >
                <div
                  className="h-3 w-3 shrink-0 rounded-full border border-white shadow-sm"
                  style={{ backgroundColor: cat.color || "#94A3B8" }}
                />
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
                  {cat.name}
                </span>
                {cat.description && (
                  <span className="hidden truncate text-[11px] text-muted-foreground sm:block sm:max-w-[200px]">
                    {cat.description}
                  </span>
                )}
                <span className="inline-flex shrink-0 items-center justify-center rounded-md bg-primary/[0.06] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-foreground">
                  {cat.productCount.toLocaleString()} items
                </span>
                <span className={cn(
                  "inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-medium",
                  cat.isActive ? "bg-emerald-50 text-emerald-600" : "bg-muted text-muted-foreground",
                )}>
                  {cat.isActive ? "Active" : "Inactive"}
                </span>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    onClick={() => openEdit(cat)}
                    className="rounded p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover:opacity-100"
                    title="Edit category"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(cat)}
                    className={cn(
                      "rounded p-1.5 transition-all group-hover:opacity-100",
                      cat.productCount > 0
                        ? "cursor-not-allowed text-muted-foreground/30 opacity-0"
                        : "text-muted-foreground opacity-0 hover:bg-destructive/10 hover:text-destructive",
                    )}
                    title={cat.productCount > 0 ? `${cat.productCount} items assigned` : "Delete category"}
                    disabled={cat.productCount > 0}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Category Modal */}
      {modalMode !== "closed" && (
        <CategoryModal
          mode={modalMode as "create" | "edit"}
          initial={editingCategory}
          onClose={closeModal}
          onSubmit={(form) => {
            if (modalMode === "create") {
              createCatMut.mutate(
                {
                  name: form.name,
                  slug: form.slug,
                  description: form.description || undefined,
                  color: form.color || undefined,
                  sortOrder: form.sortOrder,
                  isActive: form.isActive,
                } as any,
                { onSuccess: closeModal },
              );
            } else if (editingCategory) {
              updateCatMut.mutate(
                {
                  categoryId: editingCategory.id,
                  name: form.name,
                  slug: form.slug,
                  description: form.description || undefined,
                  color: form.color || undefined,
                  sortOrder: form.sortOrder,
                  isActive: form.isActive,
                } as any,
                { onSuccess: closeModal },
              );
            }
          }}
          submitting={createCatMut.isPending || updateCatMut.isPending}
          error={createCatMut.error?.message || updateCatMut.error?.message || null}
        />
      )}

      {/* Delete Category Confirmation */}
      {deleteTarget && (
        <DeleteConfirmModal
          title="Delete Category"
          itemName={deleteTarget.name}
          itemCount={deleteTarget.productCount}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
          submitting={deleteCatMut.isPending}
          error={deleteCatMut.error?.message || null}
        />
      )}
    </div>
  );
}
