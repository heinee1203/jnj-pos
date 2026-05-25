import { SelectWithQuickAdd } from "@/components/select-with-quick-add";
import type { Brand } from "@/hooks/use-brands";
import type { CategoryRow } from "@/hooks/use-categories";

type QuickAddTaxonomySectionProps = {
  brandId: string;
  brandsList: Brand[];
  categoryId: string;
  allCategories: CategoryRow[];
  handleCategoryChange: (id: string) => void;
  quickAddBrand: (name: string) => Promise<{ id: string }>;
  quickAddCategory: (name: string) => Promise<{ id: string }>;
  setBrandId: (value: string) => void;
};

export function QuickAddTaxonomySection({
  brandId,
  brandsList,
  categoryId,
  allCategories,
  handleCategoryChange,
  quickAddBrand,
  quickAddCategory,
  setBrandId,
}: QuickAddTaxonomySectionProps) {
  return (
    <>
      <SelectWithQuickAdd
        label="Category"
        value={categoryId}
        onChange={handleCategoryChange}
        options={allCategories}
        placeholder="Select category..."
        labelClassName="text-[12px] font-medium text-muted-foreground"
        onQuickAdd={quickAddCategory}
      />

      <SelectWithQuickAdd
        label="Brand"
        value={brandId}
        onChange={(v) => setBrandId(v)}
        options={brandsList}
        placeholder="No Brand"
        labelClassName="text-[12px] font-medium text-muted-foreground"
        onQuickAdd={quickAddBrand}
      />
    </>
  );
}
