import Decimal from "decimal.js";

export const D = (v: Decimal.Value) => new Decimal(v);

export function money(v: Decimal.Value): string {
  return D(v).toFixed(2);
}
