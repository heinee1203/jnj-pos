import { Sparkles } from "lucide-react";

type QuickAddIdentitySectionProps = {
  name: string;
  onGenerateSku: () => void;
  setName: (value: string) => void;
  setSku: (value: string) => void;
  sku: string;
};

export function QuickAddIdentitySection({
  name,
  onGenerateSku,
  setName,
  setSku,
  sku,
}: QuickAddIdentitySectionProps) {
  return (
    <>
      <div>
        <label className="mb-1 block text-[12px] font-medium text-muted-foreground">
          Item Name <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Mongol No. 2 Pencil 12 pcs"
          autoFocus
          className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary/40 focus:ring-2 focus:ring-primary/[0.08]"
        />
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <label className="block text-[12px] font-medium text-muted-foreground">
            SKU <span className="text-destructive">*</span>
          </label>
          <button
            type="button"
            onClick={onGenerateSku}
            title="Auto-generate SKU"
            className="inline-flex h-6 items-center gap-1 rounded-md border border-border bg-background px-2 text-[11px] font-medium text-primary transition-colors hover:bg-primary/[0.06]"
          >
            <Sparkles size={12} />
            Generate SKU
          </button>
        </div>
        <input
          type="text"
          value={sku}
          onChange={(e) => setSku(e.target.value.toUpperCase())}
          placeholder="e.g. PCL-005001"
          className="h-9 w-full rounded-lg border border-border bg-background px-3 font-mono text-[13px] text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary/40 focus:ring-2 focus:ring-primary/[0.08]"
        />
      </div>

    </>
  );
}
