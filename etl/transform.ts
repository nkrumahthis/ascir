// Transform: reads etl/raw, runs each registered record type's transform
// and writes one dump file per type to etl/dumps.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ABOUT_PAGE, SOURCES, type Raw } from "@/etl/extract";
import { DUMPS_DIR, RAW_DIR } from "@/etl/paths";
import type { DumpItem, RecordDefinition } from "@/etl/registry";

export async function readRaw(dir = RAW_DIR): Promise<Raw> {
  const records: Record<string, unknown[]> = {};
  try {
    for (const source of SOURCES) {
      const text = await readFile(join(dir, `${source.name}.json`), "utf8");
      records[source.name] = JSON.parse(text);
    }
    const aboutHtml = await readFile(join(dir, `${ABOUT_PAGE}.html`), "utf8");
    return { records, aboutHtml };
  } catch (error) {
    throw new Error(`${dir} is missing or incomplete; run etl:extract`, {
      cause: error,
    });
  }
}

export type Dumps = Map<RecordDefinition, DumpItem[]>;

export function runTransforms(
  raw: Raw,
  definitions: readonly RecordDefinition[],
): Dumps {
  const dumps: Dumps = new Map();
  for (const definition of definitions) {
    const items = definition.transform(raw);
    assertUniqueRefs(definition.type, items);
    dumps.set(definition, items);
  }
  return dumps;
}

// Refs key every upsert, so a missing or repeated one is a transform bug.
function assertUniqueRefs(type: string, items: readonly DumpItem[]) {
  const seen = new Set<string>();
  for (const [index, item] of items.entries()) {
    if (typeof item.ref !== "string" || !item.ref) {
      throw new Error(`${type} item ${index} has no ref`);
    }
    if (seen.has(item.ref)) {
      throw new Error(`${type} has ref ${item.ref} more than once`);
    }
    seen.add(item.ref);
  }
}

export async function writeDumps(dumps: Dumps, dir = DUMPS_DIR) {
  await mkdir(dir, { recursive: true });
  for (const [definition, items] of dumps) {
    const file = join(dir, `${definition.type}.json`);
    await writeFile(file, JSON.stringify(items, null, 2));
  }
}
