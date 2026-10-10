import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { Fetch } from "@/etl/http";
import { createIngestClient } from "@/etl/ingest-client";
import { push, type Dump } from "@/etl/push";
import { confirmTarget, report } from "@/etl/push-step";
import type { DumpItem } from "@/etl/registry";

const TOKEN = "s3cret-token";

// A fake ingest API: upserts keyed on ref, "unchanged" when the content
// is the same, nothing saved on a dry run, and an error for bad items.
function fakeIngest(options: { failOnce?: boolean } = {}) {
  const saved = new Map<string, string>();
  const runs = new Map<string, boolean>();
  const calls: string[] = [];
  let failed = false;
  const fetch = vi.fn<Fetch>(async (input, init) => {
    const path = new URL(String(input)).pathname;
    const body = JSON.parse(String(init?.body));
    calls.push(`${init?.method} ${path}`);
    if (new Headers(init?.headers).get("authorization") !== `Bearer ${TOKEN}`) {
      return new Response(null, { status: 401 });
    }
    if (path === "/api/ingest/runs") {
      const id = randomUUID();
      runs.set(id, body.dryRun);
      return Response.json({ id }, { status: 201 });
    }
    if (path.endsWith("/complete")) return Response.json({});
    if (options.failOnce && !failed) {
      failed = true;
      return new Response(null, { status: 502 });
    }
    const dryRun = runs.get(body.runId);
    const results = body.items.map((item: DumpItem) => {
      if (item.bad) return { ref: item.ref, status: "error", error: "bad ref" };
      const content = JSON.stringify(item);
      const before = saved.get(item.ref);
      if (!dryRun) saved.set(item.ref, content);
      if (before === undefined) return { ref: item.ref, status: "created" };
      return {
        ref: item.ref,
        status: before === content ? "unchanged" : "updated",
      };
    });
    return Response.json({ results });
  });
  const client = createIngestClient(
    { url: "http://localhost:3000", token: TOKEN },
    { fetch, sleep: async () => {} },
  );
  return { client, calls, saved };
}

function dump(type: "people" | "posts", items: DumpItem[]): Dump {
  return {
    definition: { type, endpoint: `/api/ingest/${type}`, transform: () => [] },
    items,
  };
}

const posts = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    ref: `wp:post:${i}`,
    title: `Post ${i}`,
  }));

describe("push", () => {
  it("runs a dry run, then pushes in batches of 50, one run each", async () => {
    const { client, calls, saved } = fakeIngest();

    const report = await push(client, "local", [dump("posts", posts(120))], {
      dryRunOnly: false,
    });

    expect(calls).toEqual([
      "POST /api/ingest/runs",
      ...Array(3).fill("PUT /api/ingest/posts"),
      expect.stringMatching(/^POST \/api\/ingest\/runs\/.+\/complete$/),
      "POST /api/ingest/runs",
      ...Array(3).fill("PUT /api/ingest/posts"),
      expect.stringMatching(/\/complete$/),
    ]);
    expect(report.dryRun.dryRun).toBe(true);
    expect(report.push?.counts.posts).toEqual({
      created: 120,
      updated: 0,
      unchanged: 0,
      error: 0,
    });
    expect(saved.size).toBe(120);
  });

  it("reports everything unchanged on a second run", async () => {
    const { client } = fakeIngest();
    const dumps = [dump("posts", posts(3))];
    await push(client, "local", dumps, { dryRunOnly: false });

    const again = await push(client, "local", dumps, { dryRunOnly: false });

    expect(again.push?.counts.posts).toEqual({
      created: 0,
      updated: 0,
      unchanged: 3,
      error: 0,
    });
  });

  it("stops after a dry run with errors and saves nothing", async () => {
    const { client, calls, saved } = fakeIngest();
    const people = dump("people", [{ ref: "wp:page:1", bad: true }]);

    const report = await push(
      client,
      "local",
      [people, dump("posts", posts(2))],
      {
        dryRunOnly: false,
      },
    );

    expect(report.push).toBeUndefined();
    expect(report.dryRun.errors).toEqual([
      { type: "people", ref: "wp:page:1", error: "bad ref" },
    ]);
    // posts are never sent once people failed.
    expect(calls.filter((c) => c.includes("/posts"))).toEqual([]);
    expect(saved.size).toBe(0);
  });

  it("stops after the dry run when asked", async () => {
    const { client, calls } = fakeIngest();
    const report = await push(client, "local", [dump("posts", posts(2))], {
      dryRunOnly: true,
    });
    expect(report.push).toBeUndefined();
    expect(calls.filter((c) => c === "POST /api/ingest/runs")).toHaveLength(1);
  });

  it("retries a batch after a 5xx", async () => {
    const { client, saved } = fakeIngest({ failOnce: true });
    await push(client, "local", [dump("posts", posts(2))], {
      dryRunOnly: false,
    });
    expect(saved.size).toBe(2);
  });
});

describe("confirmTarget", () => {
  const flags = { dryRun: false, cached: false };

  it("needs a target", async () => {
    await expect(confirmTarget(flags, async () => "")).rejects.toThrow(
      "push needs --target",
    );
  });

  it("asks nothing for local or preview", async () => {
    const ask = vi.fn(async () => "");
    expect(await confirmTarget({ ...flags, target: "preview" }, ask)).toBe(
      "preview",
    );
    expect(ask).not.toHaveBeenCalled();
  });

  it.each([
    ["production", "production"],
    ["  production\n", "production"],
  ])("goes ahead for production when %j is typed", async (answer, target) => {
    const result = confirmTarget(
      { ...flags, target: "production" },
      async () => answer,
    );
    expect(await result).toBe(target);
  });

  it.each(["y", "yes", "Production", ""])(
    "cancels production on %j",
    async (answer) => {
      await expect(
        confirmTarget({ ...flags, target: "production" }, async () => answer),
      ).rejects.toThrow("Push cancelled.");
    },
  );
});

describe("report", () => {
  async function runAndReport(items: DumpItem[]) {
    const dir = await mkdtemp(join(tmpdir(), "etl-run-"));
    try {
      const { client } = fakeIngest();
      const dumps = [dump("posts", items)];
      await writeFile(join(dir, "posts.json"), JSON.stringify(items));
      const result = await push(client, "local", dumps, { dryRunOnly: false });
      vi.spyOn(console, "log").mockImplementation(() => {});
      const outcome = await report(result, dumps, { dumps: dir, reports: dir })
        .then(() => "ok")
        .catch((error: unknown) => String(error));
      const runId = (result.push ?? result.dryRun).runId;
      const markdown = await readFile(join(dir, `${runId}.md`), "utf8");
      return { outcome, markdown };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  it("writes the report and succeeds when nothing failed", async () => {
    const { outcome, markdown } = await runAndReport(posts(2));
    expect(outcome).toBe("ok");
    expect(markdown).toContain("| posts | 2 | 0 | 0 | 0 |");
  });

  it("writes the report and fails the command when an item failed", async () => {
    const { outcome, markdown } = await runAndReport([
      { ref: "wp:post:1", bad: true },
    ]);
    expect(outcome).toContain("Push stopped on errors");
    expect(markdown).toContain("- `wp:post:1`: `bad ref`");
  });
});
