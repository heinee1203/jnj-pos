export type UnitOption = {
  key: string;
  label: string;
  quantity: number;
};

export function normalizeUom(value: string | null | undefined, fallback = "PIECE") {
  const normalized = value?.trim().toUpperCase() ?? "";
  return normalized || fallback;
}

function unitKey(label: string, quantity: number) {
  return `${label.trim().toLowerCase()}::${quantity}`;
}

function addUnitOption(options: UnitOption[], label: string | null | undefined, quantity: number) {
  const normalizedLabel = normalizeUom(label, "");
  const normalizedQty = Math.max(1, Math.floor(Number(quantity) || 1));
  if (!normalizedLabel) return;
  const key = unitKey(normalizedLabel, normalizedQty);
  if (options.some((option) => option.key === key)) return;
  options.push({ key, label: normalizedLabel, quantity: normalizedQty });
}

export function buildInventoryUnitOptions({
  sellingUnit,
  packagingUnit,
  purchaseUnit,
  unitsPerCase,
  conversionFactor,
}: {
  sellingUnit?: string | null;
  packagingUnit?: string | null;
  purchaseUnit?: string | null;
  unitsPerCase?: number | string | null;
  conversionFactor?: number | string | null;
}) {
  const options: UnitOption[] = [];
  const baseUnit = normalizeUom(sellingUnit);
  const caseQty = Math.max(1, Math.floor(Number(unitsPerCase) || 1));
  const purchaseQty = Math.max(1, Math.floor(Number(conversionFactor) || 1));

  addUnitOption(options, baseUnit, 1);
  addUnitOption(options, "DOZEN", 12);
  if (caseQty > 1) {
    addUnitOption(options, packagingUnit || "CASE", caseQty);
  }
  if (purchaseUnit && purchaseQty > 1) {
    addUnitOption(options, purchaseUnit, purchaseQty);
  }

  return options.sort((a, b) => a.quantity - b.quantity || a.label.localeCompare(b.label));
}

export function findUnitOption(options: UnitOption[], unitLabel: string | null | undefined) {
  const normalized = normalizeUom(unitLabel);
  return options.find((option) => option.label === normalized) ?? options[0] ?? { key: "piece::1", label: "PIECE", quantity: 1 };
}

export function formatBaseQuantity(quantity: number, unit: UnitOption, baseUnitLabel: string) {
  const baseUnit = normalizeUom(baseUnitLabel);
  const unitQty = Math.max(1, unit.quantity || 1);
  const stock = Math.max(0, Math.floor(quantity || 0));

  if (unitQty <= 1) {
    return `${stock.toLocaleString()} ${unit.label}`;
  }

  const whole = Math.floor(stock / unitQty);
  const remainder = stock % unitQty;
  if (remainder === 0) {
    return `${whole.toLocaleString()} ${unit.label}`;
  }
  return `${whole.toLocaleString()} ${unit.label} + ${remainder.toLocaleString()} ${baseUnit}`;
}

export function formatReorderPoint(quantity: number, unit: UnitOption, baseUnitLabel: string) {
  const baseUnit = normalizeUom(baseUnitLabel);
  const primary = formatBaseQuantity(quantity, unit, baseUnit);
  if (unit.quantity <= 1) return primary;
  return `${primary} / ${Math.max(0, Math.floor(quantity || 0)).toLocaleString()} ${baseUnit}`;
}
