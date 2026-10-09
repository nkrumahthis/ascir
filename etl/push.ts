// Push: sends the dumps to the ingest API. A dry run goes first and the
// real push only starts if it had no errors. Each pass is one ingest run.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { toBatches } from "@/etl/batches";
import type { Target } from "@/etl/config";
import type { Counts, IngestClient, ItemResult } from "@/etl/ingest-client";
import { DUMPS_DIR, REPORTS_DIR } from "@/etl/paths";
import type { DumpItem, RecordDefinition } from "@/etl/registry";

export type Dump = { definition: RecordDefinition; items: DumpItem[] };
export type ItemError = { type: string; ref: string; error: string };
export type PassReport = {
  runId: string;
  dryRun: boolean;
  counts: Record<string, Counts>;
  errors: ItemError[];
};
export type PushReport = {
  target: Target;
  dryRun: PassReport;
  push?: PassReport;
};

const dumpFile = z.array(z.looseObject({ ref: z.string().min(1) }));

export async function readDumps(
  definitions: readonly RecordDefinition[],
  dir = DUMPS_DIR,
): Promise<Dump[]> {
  const dumps: Dump[] = [];
  for (const definition of definitions) {
    const file = join(dir, `${definition.type}.json`);
    const text = await readFile(file, "utf8").catch((error: unknown) => {
      throw new Error(`${file} not found; run etl:transform`, { cause: error });
    });
    dumps.push({ definition, items: dumpFile.parse(JSON.parse(text)) });
  }
  return dumps;
}

export async function push(
  client: IngestClient,
  target: Target,
  dumps: readonly Dump[],
  options: { dryRunOnly: boolean },
): Promise<PushReport> {
  const dryRun = await runPass(client, target, dumps, true);
  if (dryRun.errors.length > 0 || options.dryRunOnly) {
    return { target, dryRun };
  }
  return { target, dryRun, push: await runPass(client, target, dumps, false) };
}

async function runPass(
  client: IngestClient,
  target: Target,
  dumps: readonly Dump[],
  dryRun: boolean,
): Promise<PassReport> {
  const runId = await client.startRun(target, dryRun);
  const report: PassReport = { runId, dryRun, counts: {}, errors: [] };
  try {
    for (const dump of dumps) {
      await sendDump(client, runId, dump, report);
      // Later types point at this one, so stop once it has errors.
      if (report.errors.length > 0) break;
    }
  } catch (error) {
    await finish(client, report, "failed");
    throw error;
  }
  await finish(client, report, report.errors.length ? "failed" : "completed");
  return report;
}

async function sendDump(
  client: IngestClient,
  runId: string,
  { definition, items }: Dump,
  report: PassReport,
) {
  const counts: Counts = { created: 0, updated: 0, unchanged: 0, error: 0 };
  report.counts[definition.type] = counts;
  for (const batch of toBatches(items)) {
    const results = await client.putBatch(definition.endpoint, runId, batch);
    assertEveryRef(batch, results);
    for (const result of results) {
      counts[result.status] += 1;
      if (result.status === "error") {
        const error = result.error ?? "no reason given";
        report.errors.push({ type: definition.type, ref: result.ref, error });
      }
    }
  }
}

function assertEveryRef(batch: readonly DumpItem[], results: ItemResult[]) {
  const answered = new Set(results.map((r) => r.ref));
  const missing = batch.find((item) => !answered.has(item.ref));
  if (missing)
    throw new Error(`the ingest API sent no result for ${missing.ref}`);
}

// The run endpoint wants flat counts, such as "posts.created": 3.
function finish(
  client: IngestClient,
  report: PassReport,
  status: "completed" | "failed",
) {
  const counts: Record<string, number> = {};
  for (const [type, byStatus] of Object.entries(report.counts)) {
    for (const [status, n] of Object.entries(byStatus)) {
      counts[`${type}.${status}`] = n;
    }
  }
  return client.completeRun(report.runId, status, counts, {
    errors: report.errors,
  });
}

export async function writeReport(report: PushReport, dir = REPORTS_DIR) {
  await mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = join(dir, `${stamp}-${report.target}.json`);
  await writeFile(file, JSON.stringify(report, null, 2));
  return file;
}
