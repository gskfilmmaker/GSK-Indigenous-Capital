import { describe, expect, it } from "vitest";
import { canonicalHash, canonicalize, sha256Hex } from "./canonical.js";

describe("canonicalize", () => {
  it("sorts object keys recursively regardless of insertion order", () => {
    const a = canonicalize({ b: 1, a: { d: 2, c: 3 } });
    const b = canonicalize({ a: { c: 3, d: 2 }, b: 1 });
    expect(a).toBe(b);
    expect(a).toBe('{"a":{"c":3,"d":2},"b":1}');
  });

  it("preserves array order", () => {
    expect(canonicalize([3, 1, 2])).toBe("[3,1,2]");
  });

  it("sorts keys within array elements", () => {
    const a = canonicalize([{ y: 1, x: 2 }]);
    expect(a).toBe('[{"x":2,"y":1}]');
  });
});

describe("sha256Hex", () => {
  it("matches a known SHA-256 vector", () => {
    // echo -n "abc" | sha256sum
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});

describe("canonicalHash", () => {
  it("is stable for logically identical values with different key order", () => {
    const h1 = canonicalHash({ b: 1, a: 2 });
    const h2 = canonicalHash({ a: 2, b: 1 });
    expect(h1).toBe(h2);
  });

  it("differs when a value differs", () => {
    expect(canonicalHash({ a: 1 })).not.toBe(canonicalHash({ a: 2 }));
  });
});
