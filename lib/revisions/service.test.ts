import { PGlite } from "@electric-sql/pglite";
import { asc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { revisions, user, versionColumn } from "@/lib/db/schema";
import { createRevisionService } from "@/lib/revisions/service";

// Throwaway table standing in for the first real model (T10 onwards).
const notes = pgTable("revision_test_note", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  version: versionColumn(),
});

const client = new PGlite();
const db = drizzle(client);
const service = createRevisionService(db, { post: notes });
const editor = { createdBy: "user-editor" };

beforeAll(async () => {
  // In-memory Postgres with the real migrations, so the SQL is tested too.
  await migrate(db, { migrationsFolder: "drizzle" });
  // Raw SQL: the test table is not part of the app schema or migrations.
  await db.execute(sql`
    CREATE TABLE revision_test_note (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title text NOT NULL,
      published_at timestamptz,
      version integer NOT NULL DEFAULT 1
    )`);
  await db.insert(user).values({
    id: editor.createdBy,
    name: "Editor",
    email: "editor@example.test",
    emailVerified: true,
  });
  // PGlite compiles Postgres to WebAssembly on start, which can take a while.
}, 60_000);

afterAll(() => client.close());

beforeEach(async () => {
  await db.delete(revisions);
  await db.delete(notes);
});

async function createNote() {
  const [note] = await db
    .insert(notes)
    .values({ title: "Draft", publishedAt: new Date("2025-04-30T10:00:00Z") })
    .returning();
  return note;
}

// Oldest first.
async function revisionsOf(id: string) {
  return db
    .select()
    .from(revisions)
    .where(eq(revisions.entityId, id))
    .orderBy(asc(revisions.createdAt));
}

async function currentNote(id: string) {
  const [note] = await db.select().from(notes).where(eq(notes.id, id));
  return note;
}

// Queries run in WebAssembly, so allow more than the default 5 s under load.
describe("saveWithRevision", { timeout: 20_000 }, () => {
  it("saves twice, bumping the version and writing a snapshot each time", async () => {
    const note = await createNote();

    const first = await service.saveWithRevision(
      "post",
      note.id,
      1,
      { title: "First" },
      editor,
    );
    const second = await service.saveWithRevision(
      "post",
      note.id,
      2,
      { title: "Second" },
      editor,
    );

    expect(first.ok && second.ok).toBe(true);
    expect(await currentNote(note.id)).toMatchObject({
      title: "Second",
      version: 3,
    });

    const saved = await revisionsOf(note.id);
    expect(saved.map((r) => [r.entityType, r.createdBy])).toEqual([
      ["post", "user-editor"],
      ["post", "user-editor"],
    ]);
    expect(saved.map((r) => r.snapshot)).toMatchObject([
      { id: note.id, title: "First", version: 2 },
      { id: note.id, title: "Second", version: 3 },
    ]);
  });

  it("refuses a stale save with a clear error and changes nothing", async () => {
    const note = await createNote();
    await service.saveWithRevision(
      "post",
      note.id,
      1,
      { title: "Theirs" },
      editor,
    );

    const stale = await service.saveWithRevision(
      "post",
      note.id,
      1,
      { title: "Mine" },
      editor,
    );

    expect(stale).toEqual({
      ok: false,
      error: {
        code: "stale",
        currentVersion: 2,
        message: expect.stringContaining("changed by someone else"),
      },
    });
    expect(await currentNote(note.id)).toMatchObject({
      title: "Theirs",
      version: 2,
    });
    expect(await revisionsOf(note.id)).toHaveLength(1);
  });

  it("ignores id and version in the data", async () => {
    const note = await createNote();
    await service.saveWithRevision(
      "post",
      note.id,
      1,
      {
        id: "00000000-0000-0000-0000-000000000000",
        version: 99,
        title: "Kept",
      },
      editor,
    );
    expect(await currentNote(note.id)).toMatchObject({
      title: "Kept",
      version: 2,
    });
  });

  it("reports a missing record", async () => {
    const result = await service.saveWithRevision(
      "post",
      "00000000-0000-0000-0000-000000000000",
      1,
      { title: "Nobody" },
      editor,
    );
    expect(result).toMatchObject({ ok: false, error: { code: "not_found" } });
  });

  it("refuses record types that have no table yet", async () => {
    const note = await createNote();
    const result = await service.saveWithRevision(
      "event",
      note.id,
      1,
      {},
      editor,
    );
    expect(result).toMatchObject({
      ok: false,
      error: { code: "not_registered" },
    });
  });

  it("rolls back the save when the revision cannot be written", async () => {
    const note = await createNote();
    // created_by must reference a real user, so the revision insert fails.
    await expect(
      service.saveWithRevision(
        "post",
        note.id,
        1,
        { title: "Lost" },
        { createdBy: "no-such-user" },
      ),
    ).rejects.toThrow();
    expect(await currentNote(note.id)).toMatchObject({
      title: "Draft",
      version: 1,
    });
  });

  it("allows saves no person made, such as the import", async () => {
    const note = await createNote();
    const result = await service.saveWithRevision(
      "post",
      note.id,
      1,
      { title: "Imported" },
      { createdBy: null, note: "Imported from ascir.org" },
    );
    expect(result).toMatchObject({
      ok: true,
      value: { revision: { createdBy: null, note: "Imported from ascir.org" } },
    });
  });
});
