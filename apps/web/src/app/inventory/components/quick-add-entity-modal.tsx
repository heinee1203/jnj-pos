"use client";

import { useState } from "react";

export type QuickAddEntityType = "category" | "brand";

interface EntityCreateMutation<TInput> {
  mutateAsync: (input: TInput) => Promise<unknown>;
}

interface QuickAddEntityModalProps {
  type: QuickAddEntityType;
  onClose: () => void;
  onCreated: (type: QuickAddEntityType, id: string) => void;
  createCategory: EntityCreateMutation<{ name: string; slug: string }>;
  createBrand: EntityCreateMutation<{ name: string; slug: string }>;
}

export function QuickAddEntityModal({
  type,
  onClose,
  onCreated,
  createCategory,
  createBrand,
}: QuickAddEntityModalProps) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const titles: Record<QuickAddEntityType, string> = {
    category: "Add New Category",
    brand: "Add New Brand",
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    setSaving(true);
    setError("");
    try {
      let result: unknown;
      if (type === "category") {
        result = await createCategory.mutateAsync({ name: name.trim(), slug });
      } else {
        result = await createBrand.mutateAsync({ name: name.trim(), slug });
      }
      onCreated(type, getCreatedId(result));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
      setSaving(false);
    }
  };

  const fieldClass = "w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-sm rounded-lg bg-background p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-3 text-sm font-semibold">{titles[type]}</h3>
        <div className="space-y-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Name *</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder={`Enter ${type} name...`}
              className={fieldClass}
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted">Cancel</button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || saving}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

function getCreatedId(result: unknown): string {
  if (result && typeof result === "object" && "id" in result) {
    const id = (result as { id?: unknown }).id;
    return typeof id === "string" ? id : "";
  }
  return "";
}
