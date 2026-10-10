import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { PassReport, PushReport } from "@/etl/push";
import {
  errorSection,
  readKnownRefs,
  renderReport,
  runChecks,
  writeRunReport,
} from "@/etl/report";
import type { ReportCheck } from "@/etl/report-checks";

const counts = { created: 2, updated: 1, unchanged: 5, error: 1 };

function pass(dryRun: boolean, runId: string): PassReport {
  return {
    runId,
    dryRun,
    counts: { posts: counts },
    errors: [{ type: "posts", ref: "wp:post:1", error: "unknown author" }],
  };
}

const report: PushReport = {
  target: "preview",
  dryRun: { ...pass(true, "dry-1"), errors: [] },
  push: pass(false, "run-2"),
};

describe("renderReport", () => {
  it("shows counts per type and every section, empty ones included", () => {
    const markdown = renderReport(
      report,
      [
        errorSection(report),
        { title: "Images missing alt text", findings: [] },
      ],
      new Date("2026-10-10T09:00:00Z"),
    );

    expect(markdown).toContain("# ETL run run-2");
    expect(markdown).toContain("Dry run: dry-1. Push: run-2.");
    expect(markdown).toContain("| posts | 2 | 1 | 5 | 1 |");
    expect(markdown).toContain(
      "## Errors (1)\n\n- `wp:post:1`: `unknown author`",
    );
    expect(markdown).toContain("## Images missing alt text (0)\n\nNone.");
  });

  it("reports the dry run when the push never ran", () => {
    const stopped: PushReport = {
      target: "local",
      dryRun: pass(true, "dry-9"),
    };
    const markdown = renderReport(stopped, [errorSection(stopped)], new Date());
    expect(markdown).toContain("# ETL run dry-9");
    expect(markdown).toContain("Push: not run.");
    expect(markdown).toContain("## Errors (1)");
  });

  it("keeps content from breaking out of its code span", () => {
    const markdown = renderReport(
      report,
      [{ title: "X", findings: [{ ref: "wp:post:1", detail: "a `b` c" }] }],
      new Date(),
    );
    expect(markdown).toContain("`a 'b' c`");
  });
});

describe("runChecks", () => {
  it("runs every plugged-in check", () => {
    const check: ReportCheck = {
      title: "Posts without a summary",
      run: () => [{ ref: "wp:post:7", detail: "excerpt is empty" }],
    };
    const context = { pushed: [], knownRefs: new Set<string>() };
    expect(runChecks(context, [check])).toEqual([
      {
        title: "Posts without a summary",
        findings: [{ ref: "wp:post:7", detail: "excerpt is empty" }],
      },
    ]);
  });
});

describe("files", () => {
  it("writes <run id>.md and reads refs from every dump", async () => {
    const dir = await mkdtemp(join(tmpdir(), "etl-report-"));
    try {
      const file = await writeRunReport("# hi\n", "run-2", dir);
      expect(file).toBe(join(dir, "run-2.md"));
      expect(await readFile(file, "utf8")).toBe("# hi\n");

      await writeFile(join(dir, "people.json"), '[{"ref":"wp:page:1"}]');
      await writeFile(join(dir, "posts.json"), '[{"ref":"wp:post:2"}]');
      expect(await readKnownRefs(dir)).toEqual(
        new Set(["wp:page:1", "wp:post:2"]),
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
