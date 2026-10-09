import { describe, expect, it } from "vitest";
import { isRunId, parseCompleteRun, parseStartRun } from "@/lib/ingest/runs";

describe("parseStartRun", () => {
  it("accepts a target and defaults dryRun to false", () => {
    expect(parseStartRun({ target: " posts " })).toEqual({
      ok: true,
      value: { target: "posts", dryRun: false },
    });
    expect(parseStartRun({ target: "all", dryRun: true })).toMatchObject({
      ok: true,
      value: { dryRun: true },
    });
  });

  it("rejects bad bodies without echoing them", () => {
    for (const body of [
      undefined,
      null,
      [],
      "x",
      {},
      { target: "" },
      { target: 1 },
      { target: "a".repeat(101) },
      { target: "posts", dryRun: "yes" },
    ]) {
      const result = parseStartRun(body);
      expect(result.ok).toBe(false);
    }
    const result = parseStartRun({
      target: "secret-value",
      dryRun: "secret-value",
    });
    expect(JSON.stringify(result)).not.toContain("secret-value");
  });
});

describe("parseCompleteRun", () => {
  it("defaults status to completed and report to null", () => {
    expect(parseCompleteRun({ counts: { created: 3, skipped: 0 } })).toEqual({
      ok: true,
      value: {
        status: "completed",
        counts: { created: 3, skipped: 0 },
        report: null,
      },
    });
  });

  it("accepts a failed run with a report", () => {
    expect(
      parseCompleteRun({
        counts: {},
        status: "failed",
        report: { error: "timeout" },
      }),
    ).toMatchObject({
      ok: true,
      value: { status: "failed", report: { error: "timeout" } },
    });
  });

  it("rejects bad counts and statuses", () => {
    for (const body of [
      undefined,
      {},
      { counts: [] },
      { counts: { a: -1 } },
      { counts: { a: 1.5 } },
      { counts: { a: "1" } },
      { counts: {}, status: "running" },
    ]) {
      expect(parseCompleteRun(body).ok).toBe(false);
    }
  });
});

describe("isRunId", () => {
  it("only accepts UUIDs", () => {
    expect(isRunId("0b7a3c1e-4f0d-4a8e-9c2b-1d2e3f4a5b6c")).toBe(true);
    expect(isRunId("1")).toBe(false);
    expect(isRunId("0b7a3c1e-4f0d-4a8e-9c2b-1d2e3f4a5b6c' or 1=1")).toBe(false);
  });
});
