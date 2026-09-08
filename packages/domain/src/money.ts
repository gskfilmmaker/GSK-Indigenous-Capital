import { z } from "zod";
import { positiveDecimalStringSchema } from "./decimal.js";

/**
 * MVP is CAD-only (spec §7.8, §26 development default): one currency per
 * scenario, and this literal is that currency. Multi-currency requires a
 * counsel-approved branch per the spec — not a schema change made casually.
 */
export const currencyCodeSchema = z.literal("CAD");
export type CurrencyCode = z.infer<typeof currencyCodeSchema>;

export const moneySchema = z.object({
  amount: positiveDecimalStringSchema,
  currency: currencyCodeSchema,
});
export type Money = z.infer<typeof moneySchema>;
