// Entry point: tsx etl/cli.ts <all|extract|transform> [flags].
// npm run etl runs every step in order and stops at the first failure.

import { extract, writeRaw } from "@/etl/extract";
import { parseFlags, type Flags } from "@/etl/flags";
import { selectRecords } from "@/etl/registry";
import { readRaw, runTransforms, writeDumps } from "@/etl/transform";

const STEPS = ["all", "extract", "transform"] as const;
type Step = (typeof STEPS)[number];

async function runExtract() {
  console.log("Extracting from ascir.org...");
  const { raw, reported } = await extract();
  const counts = await writeRaw(raw, reported);
  for (const [name, { received, reported }] of Object.entries(counts)) {
    const note =
      received === reported
        ? ""
        : ` (ascir.org reports ${reported}; the rest are not public)`;
    console.log(`  ${name}: ${received}${note}`);
  }
}

async function runTransform(flags: Flags) {
  const definitions = selectRecords(flags.only);
  if (definitions.length === 0) {
    console.log("Transform: no record types registered yet.");
    return;
  }
  const dumps = runTransforms(await readRaw(), definitions);
  await writeDumps(dumps);
  for (const [definition, items] of dumps) {
    console.log(`  ${definition.type}: ${items.length}`);
  }
}

async function run(step: Step, flags: Flags) {
  if (step === "extract") return runExtract();
  if (step === "transform") return runTransform(flags);
  if (!flags.cached) await runExtract();
  await runTransform(flags);
}

async function main() {
  const [step, ...args] = process.argv.slice(2);
  if (!STEPS.includes(step as Step)) {
    throw new Error(`usage: tsx etl/cli.ts <${STEPS.join("|")}> [flags]`);
  }
  const flags = parseFlags(args);
  if (!flags.ok) throw new Error(flags.error);
  await run(step as Step, flags.value);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
