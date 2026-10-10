// The push step of the CLI: checks the target, asks before production,
// pushes, then writes the run report and prints its summary.

import { createInterface } from "node:readline/promises";
import { loadIngestConfig, type Target } from "@/etl/config";
import type { Flags } from "@/etl/flags";
import { createIngestClient } from "@/etl/ingest-client";
import {
  push,
  readDumps,
  type Dump,
  type PassReport,
  type PushReport,
} from "@/etl/push";
import { selectRecords } from "@/etl/registry";
import {
  countLines,
  errorSection,
  lastPass,
  readKnownRefs,
  renderReport,
  runChecks,
  writeRunReport,
} from "@/etl/report";

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
  const result = await push(client, target, dumps, {
    dryRunOnly: flags.dryRun,
  });
  await report(result, dumps);
}

// Writes etl/reports/<run id>.md, prints the summary and fails the command
// (non-zero exit) when any item had an error.
export async function report(
  result: PushReport,
  dumps: readonly Dump[],
  dirs: { dumps?: string; reports?: string } = {},
) {
  const knownRefs = await readKnownRefs(dirs.dumps);
  const checks = runChecks({ pushed: dumps, knownRefs });
  const sections = [errorSection(result), ...checks];
  const markdown = renderReport(result, sections, new Date());
  const pass = lastPass(result);
  const file = await writeRunReport(markdown, pass.runId, dirs.reports);

  printPass(pass);
  for (const section of sections) {
    console.log(`  ${section.title}: ${section.findings.length}`);
  }
  console.log(`Report saved to ${file}`);
  if (pass.errors.length > 0) {
    throw new Error("Push stopped on errors; see the report.");
  }
}

function printPass(pass: PassReport) {
  console.log(`${pass.dryRun ? "Dry run" : "Push"} (run ${pass.runId}):`);
  for (const line of countLines(pass)) console.log(`  ${line}`);
}
