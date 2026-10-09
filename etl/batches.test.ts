import { describe, expect, it } from "vitest";
import { toBatches } from "@/etl/batches";

describe("toBatches", () => {
  const items = (n: number, size = 0) =>
    Array.from({ length: n }, (_, i) => ({
      ref: `r${i}`,
      body: "x".repeat(size),
    }));

  it("sends at most 50 items per batch", () => {
    expect(toBatches(items(120)).map((b) => b.length)).toEqual([50, 50, 20]);
  });

  it("starts a new batch before the byte limit", () => {
    const batches = toBatches(items(5, 400), { items: 50, bytes: 1000 });
    expect(batches.map((b) => b.length)).toEqual([2, 2, 1]);
  });

  it("refuses an item too large for any request", () => {
    expect(() => toBatches(items(1, 2000), { items: 50, bytes: 1000 })).toThrow(
      "r0 is too large",
    );
  });
});
