// Turns a stored snapshot back into values a table update accepts.

import { getTableColumns } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";

// Saving sets these, so a restore never copies them from the snapshot.
const MANAGED = new Set(["id", "version"]);

// Snapshots are jsonb, so timestamps come back as ISO strings. Drizzle's
// timestamp columns need Date objects, so convert them by column type.
export function snapshotToValues(
  table: PgTable,
  snapshot: Record<string, unknown>,
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const [key, column] of Object.entries(getTableColumns(table))) {
    if (MANAGED.has(key) || !(key in snapshot)) continue;
    const value = snapshot[key];
    values[key] =
      column.dataType === "date" && typeof value === "string"
        ? new Date(value)
        : value;
  }
  return values;
}
