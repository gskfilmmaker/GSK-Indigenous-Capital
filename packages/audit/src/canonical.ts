import { createHash } from "node:crypto";

/**
 * Deterministic JSON serialization: object keys sorted recursively, arrays
 * preserve order. Used everywhere a byte-stable representation is required
 * (scenario snapshot hashing, engine output hashing, audit event hashing) so
 * that identical logical values always serialize identically regardless of
 * property insertion order.
 *
 * Callers are responsible for converting non-JSON-safe values (Decimal
 * instances, Dates) to strings before calling this — this function does not
 * special-case them, so an unconverted value serializes however
 * `JSON.stringify` would (and a `Decimal` or `Date` passed directly is very
 * unlikely to be what the caller wants hashed).
 */
export function canonicalize(value: unknown): string {
  return JSON.stringify(sortForCanonicalization(value));
}

function sortForCanonicalization(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortForCanonicalization);
  }
  if (value !== null && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      sorted[key] = sortForCanonicalization(source[key]);
    }
    return sorted;
  }
  return value;
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/** Canonicalize then hash in one step — the common case. */
export function canonicalHash(value: unknown): string {
  return sha256Hex(canonicalize(value));
}
