// Saves records with edit history: every save writes a revision, and a
// save based on an old version is refused.

import { and, eq } from "drizzle-orm";
import type {
  PgColumn,
  PgDatabase,
  PgQueryResultHKT,
  PgTable,
} from "drizzle-orm/pg-core";
import { revisions, type EntityType } from "@/lib/db/revision-schema";

// A table that keeps history needs an id and a version column.
export type VersionedTable = PgTable & { id: PgColumn; version: PgColumn };

export type RevisionDb = PgDatabase<PgQueryResultHKT, Record<string, unknown>>;

export type Revision = typeof revisions.$inferSelect;

export type SaveOptions = { createdBy: string | null; note?: string };

export type SaveError =
  | { code: "not_registered"; message: string }
  | { code: "not_found"; message: string }
  | { code: "stale"; message: string; currentVersion: number };

export type SaveResult =
  | { ok: true; value: { record: Record<string, unknown>; revision: Revision } }
  | { ok: false; error: SaveError };

type Tx = Parameters<Parameters<RevisionDb["transaction"]>[0]>[0];

export function createRevisionService(
  db: RevisionDb,
  tables: Partial<Record<EntityType, VersionedTable>>,
) {
  async function saveWithRevision(
    entityType: EntityType,
    id: string,
    expectedVersion: number,
    data: Record<string, unknown>,
    options: SaveOptions,
  ): Promise<SaveResult> {
    const table = tables[entityType];
    if (!table) return notRegistered(entityType);

    return db.transaction(async (tx) => {
      const values = { ...withoutManaged(data), version: expectedVersion + 1 };
      const [record] = await tx
        .update(table)
        .set(values)
        .where(and(eq(table.id, id), eq(table.version, expectedVersion)))
        .returning();
      if (!record) {
        return {
          ok: false,
          error: await whyNotSaved(tx, table, entityType, id),
        };
      }

      const [revision] = await tx
        .insert(revisions)
        .values({
          entityType,
          entityId: id,
          snapshot: record,
          note: options.note ?? null,
          createdBy: options.createdBy,
        })
        .returning();
      return { ok: true, value: { record, revision } };
    });
  }

  return { saveWithRevision };
}

export type RevisionService = ReturnType<typeof createRevisionService>;

function withoutManaged(data: Record<string, unknown>) {
  const rest = { ...data };
  delete rest.id;
  delete rest.version;
  return rest;
}

function notRegistered(entityType: EntityType): SaveResult {
  return {
    ok: false,
    error: {
      code: "not_registered",
      message: `Edit history is not set up for ${entityType} records yet.`,
    },
  };
}

// The update matched no row: either the record is gone or it moved on.
async function whyNotSaved(
  tx: Tx,
  table: VersionedTable,
  entityType: EntityType,
  id: string,
): Promise<SaveError> {
  const [current] = await tx
    .select({ version: table.version })
    .from(table)
    .where(eq(table.id, id));
  if (!current) {
    return { code: "not_found", message: `That ${entityType} does not exist.` };
  }
  const currentVersion = Number(current.version);
  return {
    code: "stale",
    currentVersion,
    message:
      `This ${entityType} was changed by someone else since you opened it ` +
      `(it is now at version ${currentVersion}). Reload to see their ` +
      `changes, then save again.`,
  };
}
