import { describe, expect, it } from "vitest";
import { parseFlags } from "@/etl/flags";

describe("parseFlags", () => {
  it("defaults to no target, no dry run, no cache and every type", () => {
    expect(parseFlags([])).toEqual({
      ok: true,
      value: { dryRun: false, cached: false },
    });
  });

  it("reads every flag", () => {
    expect(
      parseFlags([
        "--target=preview",
        "--dry-run",
        "--cached",
        "--only=posts,people",
      ]),
    ).toEqual({
      ok: true,
      value: {
        target: "preview",
        dryRun: true,
        cached: true,
        only: ["posts", "people"],
      },
    });
  });

  it.each([
    [["--target=staging"], "--target is not valid"],
    [["--only=posts,secrets"], "--only is not valid"],
    [["--dry-run=yes"], "unknown flag --dry-run"],
    [["--force"], "unknown flag --force"],
  ])("rejects %j", (args, error) => {
    expect(parseFlags(args)).toEqual({ ok: false, error });
  });

  it("does not echo the bad value", () => {
    const result = parseFlags(["--target=hunter2"]);
    expect(JSON.stringify(result)).not.toContain("hunter2");
  });
});
