import { describe, expect, it } from "vitest";
import { eligibleMfnCandidates } from "./mfnCandidates.js";
import { UnsupportedCaseError } from "./errors.js";

describe("eligibleMfnCandidates — spec §8 test 10: MFN order", () => {
  it("only SAFEs issued after the MFN instrument are eligible candidates", () => {
    const instruments = [
      { id: "a", sequence: 0 },
      { id: "mfn", sequence: 1 },
      { id: "b", sequence: 2 },
    ];
    expect(eligibleMfnCandidates(instruments, "mfn").map((i) => i.id)).toEqual(["b"]);
  });

  it("moving a later cap SAFE before the MFN removes it from the candidate set and recalculates", () => {
    const before = [
      { id: "a", sequence: 0 },
      { id: "mfn", sequence: 1 },
      { id: "b", sequence: 2 },
    ];
    expect(eligibleMfnCandidates(before, "mfn").map((i) => i.id)).toEqual(["b"]);

    // Reorder: "b" now issued before the MFN (sequence 0), "a" after (sequence 2).
    const afterReorder = [
      { id: "b", sequence: 0 },
      { id: "mfn", sequence: 1 },
      { id: "a", sequence: 2 },
    ];
    expect(eligibleMfnCandidates(afterReorder, "mfn").map((i) => i.id)).toEqual(["a"]);
  });

  it("throws when the named MFN instrument is not in the list", () => {
    expect(() => eligibleMfnCandidates([{ id: "a", sequence: 0 }], "missing")).toThrow(
      UnsupportedCaseError,
    );
  });
});
