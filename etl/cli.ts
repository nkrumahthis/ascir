// Entry point: tsx etl/cli.ts <step>. Each step is also an npm script.

import { extract, writeRaw } from "@/etl/extract";

const STEPS = ["extract"] as const;
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

async function main() {
  const [step] = process.argv.slice(2);
  if (!STEPS.includes(step as Step)) {
    throw new Error(`usage: tsx etl/cli.ts <${STEPS.join("|")}>`);
  }
  await runExtract();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
