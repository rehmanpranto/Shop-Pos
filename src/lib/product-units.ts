type ProductUnitLike = {
  baseUnitId: string;
  unitConversions?: Array<{
    fromUnitId: string;
    toUnitId: string;
  }>;
};

export function isAllowedProductUnit(product: ProductUnitLike, unitId: string) {
  if (unitId === product.baseUnitId) return true;

  return (product.unitConversions ?? []).some(
    (conversion) => conversion.fromUnitId === unitId || conversion.toUnitId === unitId,
  );
}