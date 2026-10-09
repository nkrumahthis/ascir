// The push step of the CLI: checks the target, asks before production,
// pushes, prints a summary and saves the report to etl/reports.

import { createInterface } from "node:readline/promises";
import { loadIngestConfig, type Target } from "@/etl/config";
import type { Flags } from "@/etl/flags";
import { createIngestClient } from "@/etl/ingest-client";
import { push, readDumps, writeReport, type PassReport } from "@/etl/push";
import { selectRecords } from "@/etl/registry";

export type Ask = (question: string) => Promise<string>;

export async function askInTerminal(question: string) {
  const terminal = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    return await terminal.question(question);
  } finally {
    terminal.close();
  }
}

// Production needs the word typed out, not just "y".
export async function confirmTarget(flags: Flags, ask: Ask): Promise<Target> {
  if (!flags.target) {
    throw new Error("push needs --target=local, preview or production");
  }
  if (flags.target !== "production") return flags.target;
  const answer = await ask("Type 'production' to push to production: ");
  if (answer.trim() !== "production") throw new Error("Push cancelled.");
  return "production";
}

export async function runPush(flags: Flags, target: Target) {
  const definitions = selectRecords(flags.only);
  if (definitions.length === 0) {
    console.log("Push: no record types registered yet.");
    return;
  }
  const client = createIngestClient(await loadIngestConfig(target));
  const dumps = await readDumps(definitions);
  const report = await push(client, target, dumps, {
    dryRunOnly: flags.dryRun,
  });
  printPass(report.dryRun);
  if (report.push) printPass(report.push);
  console.log(`Report saved to ${await writeReport(report)}`);
  if (report.dryRun.errors.length > 0 || report.push?.errors.length) {
    throw new Error("Push stopped on errors; see the report.");
  }
}

function printPass(pass: PassReport) {
  console.log(`${pass.dryRun ? "Dry run" : "Push"} (run ${pass.runId}):`);
  for (const [type, c] of Object.entries(pass.counts)) {
    console.log(
      `  ${type}: ${c.created} created, ${c.updated} updated, ` +
        `${c.unchanged} unchanged, ${c.error} errors`,
    );
  }
  for (const e of pass.errors) console.log(`  ${e.type} ${e.ref}: ${e.error}`);
}
