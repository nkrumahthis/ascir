import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { writeRaw, type Raw } from "@/etl/extract";
import { REGISTRY, selectRecords, type RecordDefinition } from "@/etl/registry";
import { readRaw, runTransforms } from "@/etl/transform";
import posts from "@/etl/fixtures/posts.json";

const raw: Raw = { records: { posts }, aboutHtml: "" };

function definition(
  type: RecordDefinition["type"],
  transform: RecordDefinition["transform"] = () => [],
): RecordDefinition {
  return { type, endpoint: `/api/ingest/${type}`, transform };
}

describe("selectRecords", () => {
  it("ships with no record types", () => {
    expect(REGISTRY).toEqual([]);
    expect(selectRecords()).toEqual([]);
  });

  it("returns registered types in push order, filtered by --only", () => {
    const registry = [
      definition("events"),
      definition("posts"),
      definition("media"),
      definition("people"),
    ];
    expect(selectRecords(undefined, registry).map((d) => d.type)).toEqual([
      "media",
      "people",
      "posts",
      "events",
    ]);
    expect(
      selectRecords(["events", "media"], registry).map((d) => d.type),
    ).toEqual(["media", "events"]);
  });
});

describe("runTransforms", () => {
  it("runs each transform on the raw data", () => {
    const toRefs = definition("posts", (input) =>
      (input.records.posts as { id: number }[]).map((p) => ({
        ref: `wp:post:${p.id}`,
      })),
    );
    const dumps = runTransforms(raw, [toRefs]);
    expect(dumps.get(toRefs)).toEqual([
      { ref: "wp:post:3741" },
      { ref: "wp:post:2967" },
      { ref: "wp:post:3261" },
      { ref: "wp:post:2731" },
    ]);
  });

  it("rejects items without a ref or with a repeated one", () => {
    const missing = definition("posts", () => [{ ref: "" }]);
    const repeated = definition("posts", () => [
      { ref: "wp:post:1" },
      { ref: "wp:post:1" },
    ]);
    expect(() => runTransforms(raw, [missing])).toThrow("item 0 has no ref");
    expect(() => runTransforms(raw, [repeated])).toThrow(
      "ref wp:post:1 more than once",
    );
  });
});

describe("readRaw", () => {
  it("reads back what extract wrote", async () => {
    const dir = await mkdtemp(join(tmpdir(), "etl-raw-"));
    try {
      const full: Raw = {
        records: {
          posts,
          pages: [],
          media: [],
          categories: [],
          users: [],
          events: [],
        },
        aboutHtml: "<h1>About</h1>",
      };
      await writeRaw(full, {}, dir);
      expect(await readRaw(dir)).toEqual(full);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("says to run extract when etl/raw is missing", async () => {
    await expect(readRaw(join(tmpdir(), "no-such-raw-dir"))).rejects.toThrow(
      "run etl:extract",
    );
  });
});
