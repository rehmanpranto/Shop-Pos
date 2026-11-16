import { Prisma } from "@prisma/client";

// Use the database library's own decimal type everywhere, so amounts read from the
// database and amounts calculated in the app can always be combined with each other.
export const Decimal = Prisma.Decimal;
export type Decimal = Prisma.Decimal;

export const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);

export function money(v: Prisma.Decimal.Value): string {
  return D(v).toFixed(2);
}
