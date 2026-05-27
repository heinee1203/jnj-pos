import { Barcode } from "lucide-react";

type QuickAddIdentifiersSectionProps = {
  barcode: string;
  onGenerateBarcode: () => void;
  setBarcode: (value: string) => void;
};

export function QuickAddIdentifiersSection({
  barcode,
  onGenerateBarcode,
  setBarcode,
}: QuickAddIdentifiersSectionProps) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label className="block text-[12px] font-medium text-muted-foreground">
          Barcode
        </label>
        <button
          type="button"
          onClick={onGenerateBarcode}
          title="Auto-generate EAN-13 barcode"
          className="inline-flex h-6 items-center gap-1 rounded-md border border-border bg-background px-2 text-[11px] font-medium text-primary transition-colors hover:bg-primary/[0.06]"
        >
          <Barcode size={12} />
          Generate EAN-13
        </button>
      </div>
      <input
        type="text"
        value={barcode}
        onChange={(e) => setBarcode(e.target.value.slice(0, 50))}
        placeholder="Scan barcode or leave blank"
        maxLength={50}
        className="h-9 w-full rounded-lg border border-border bg-background px-3 font-mono text-[13px] text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary/40 focus:ring-2 focus:ring-primary/[0.08]"
      />
      <p className="mt-0.5 text-[10px] text-muted-foreground">
        Generate an internal EAN-13 barcode for labels, or scan a supplier barcode.
      </p>
    </div>
  );
}
