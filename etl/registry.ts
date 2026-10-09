// The record types the ETL knows. Each type registers its transform and
// the ingest endpoint its dump goes to. None are registered yet; each
// model's ETL ticket adds one.

import type { Raw } from "@/etl/extract";
import { RECORD_TYPES, type RecordType } from "@/etl/flags";

// Every item carries the stable source ref, such as wp:post:3741.
export type DumpItem = { ref: string } & Record<string, unknown>;

export type RecordDefinition = {
  type: RecordType;
  // Path on the app, such as /api/ingest/posts.
  endpoint: string;
  // Pure: raw data in, dump items out. No network or file access.
  transform: (raw: Raw) => DumpItem[];
};

export const REGISTRY: readonly RecordDefinition[] = [];

// Registered types, filtered by --only, in push order (RECORD_TYPES), so
// refs resolve: media before the posts that use it, and so on.
export function selectRecords(
  only?: readonly RecordType[],
  registry: readonly RecordDefinition[] = REGISTRY,
): RecordDefinition[] {
  return RECORD_TYPES.flatMap((type) => {
    if (only && !only.includes(type)) return [];
    return registry.filter((definition) => definition.type === type);
  });
}
