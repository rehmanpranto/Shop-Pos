import { Decimal } from "@/lib/numbers";

type ProductUnitLike = {
  name?: string;
  baseUnitId: string;
  unitConversions?: Array<{
    fromUnitId: string;
    toUnitId: string;
    factor?: Decimal | number | string;
  }>;
};

/**
 * How many base units one `unitId` is worth for this product.
 * A conversion row reads "1 fromUnit = factor × base unit" (e.g. 1 BOX = 12 PC).
 * Returns null when the product is not sold in that unit.
 */
export function unitFactor(product: ProductUnitLike, unitId: string): Decimal | null {
  if (unitId === product.baseUnitId) return new Decimal(1);
  const conversion = (product.unitConversions ?? []).find((c) => c.fromUnitId === unitId && c.toUnitId === product.baseUnitId);
  if (!conversion || conversion.factor === undefined) return null;
  const factor = new Decimal(conversion.factor);
  return factor.greaterThan(0) ? factor : null;
}

export function requireUnitFactor(product: ProductUnitLike, unitId: string): Decimal {
  const factor = unitFactor(product, unitId);
  if (!factor) throw new Error(`Invalid unit for product ${product.name ?? ""}`.trim());
  return factor;
}

export function isAllowedProductUnit(product: ProductUnitLike, unitId: string) {
  return unitFactor(product, unitId) !== null;
}
