function randomInt(maxExclusive: number): number {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const value = new Uint32Array(1);
    crypto.getRandomValues(value);
    return value[0] % maxExclusive;
  }
  return Math.floor(Math.random() * maxExclusive);
}

function skuPrefixFromName(name: string): string {
  const tokens = name
    .toUpperCase()
    .match(/[A-Z0-9]+/g)
    ?.filter(Boolean) ?? [];

  if (tokens.length >= 3) {
    return tokens.slice(0, 3).map((token) => token[0]).join("");
  }

  const compact = tokens.join("");
  if (compact.length > 0) return compact.slice(0, 3).padEnd(3, "X");
  return "ITEM";
}

export function generateSku(name: string): string {
  const prefix = skuPrefixFromName(name);
  const sequence = randomInt(1_000_000).toString().padStart(6, "0");
  return `${prefix}-${sequence}`;
}

export function getEan13CheckDigit(base12: string): string {
  const sum = base12
    .split("")
    .reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
  return ((10 - (sum % 10)) % 10).toString();
}

export function generateEan13Barcode(): string {
  const timestampPart = Date.now().toString().slice(-7);
  const randomPart = randomInt(100).toString().padStart(2, "0");
  const base12 = `200${timestampPart}${randomPart}`;
  return `${base12}${getEan13CheckDigit(base12)}`;
}
