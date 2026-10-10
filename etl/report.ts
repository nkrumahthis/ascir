// The run report: counts per record type, every item error, and the
// findings of each report check, written to etl/reports/<run id>.md.

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { PassReport, PushReport } from "@/etl/push";
import { DUMPS_DIR, REPORTS_DIR } from "@/etl/paths";
import {
  REPORT_CHECKS,
  type CheckContext,
  type Finding,
  type ReportCheck,
} from "@/etl/report-checks";

export type Section = { title: string; findings: Finding[] };

export function runChecks(
  context: CheckContext,
  checks: readonly ReportCheck[] = REPORT_CHECKS,
): Section[] {
  return checks.map((check) => ({
    title: check.title,
    findings: check.run(context),
  }));
}

// The last pass that ran: the real push, or the dry run if it stopped there.
export function lastPass(report: PushReport): PassReport {
  return report.push ?? report.dryRun;
}

export function errorSection(report: PushReport): Section {
  const findings = lastPass(report).errors.map((e) => ({
    ref: e.ref,
    detail: e.error,
  }));
  return { title: "Errors", findings };
}

export function countLines(pass: PassReport): string[] {
  return Object.entries(pass.counts).map(
    ([type, c]) =>
      `${type}: ${c.created} created, ${c.updated} updated, ` +
      `${c.unchanged} unchanged, ${c.error} errors`,
  );
}

// Values come from ascir.org content, so keep them inside code spans.
const code = (text: string) => `\`${text.replace(/`/g, "'")}\``;

export function renderReport(
  report: PushReport,
  sections: readonly Section[],
  now: Date,
): string {
  const pass = lastPass(report);
  const lines = [
    `# ETL run ${pass.runId}`,
    "",
    `Target: ${report.target}. Finished ${now.toISOString()}.`,
    `Dry run: ${report.dryRun.runId}. Push: ${report.push?.runId ?? "not run"}.`,
    "",
    "## Counts",
    "",
    "| Type | Created | Updated | Unchanged | Errors |",
    "| --- | --- | --- | --- | --- |",
    ...Object.entries(pass.counts).map(
      ([type, c]) =>
        `| ${type} | ${c.created} | ${c.updated} | ${c.unchanged} | ${c.error} |`,
    ),
  ];
  for (const section of sections) {
    lines.push("", `## ${section.title} (${section.findings.length})`, "");
    if (section.findings.length === 0) lines.push("None.");
    for (const f of section.findings) {
      lines.push(`- ${code(f.ref)}: ${code(f.detail)}`);
    }
  }
  return lines.join("\n") + "\n";
}

export async function writeRunReport(
  markdown: string,
  runId: string,
  dir = REPORTS_DIR,
) {
  await mkdir(dir, { recursive: true });
  const file = join(dir, `${runId}.md`);
  await writeFile(file, markdown);
  return file;
}

// Refs from every dump on disk, so a post pushed alone with --only still
// resolves the people it points at.
export async function readKnownRefs(dir = DUMPS_DIR): Promise<Set<string>> {
  const refs = new Set<string>();
  const files = await readdir(dir);
  for (const file of files.filter((f) => f.endsWith(".json"))) {
    const items: unknown = JSON.parse(await readFile(join(dir, file), "utf8"));
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      if (typeof item?.ref === "string") refs.add(item.ref);
    }
  }
  return refs;
}
