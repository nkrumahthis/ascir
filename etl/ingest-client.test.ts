import { describe, expect, it, vi } from "vitest";
import type { Fetch } from "@/etl/http";
import { createIngestClient } from "@/etl/ingest-client";

const TOKEN = "s3cret-token";

function clientFor(...responses: Response[]) {
  const fetch = vi.fn<Fetch>();
  for (const response of responses) fetch.mockResolvedValueOnce(response);
  const client = createIngestClient(
    { url: "http://localhost:3000", token: TOKEN },
    { fetch, sleep: async () => {} },
  );
  return { client, fetch };
}

const RUN_ID = "3f2b8c1e-4d5a-4e6f-8a9b-0c1d2e3f4a5b";

describe("createIngestClient", () => {
  it("sends the token and returns the new run id", async () => {
    const { client, fetch } = clientFor(Response.json({ id: RUN_ID }));

    expect(await client.startRun("local", true)).toBe(RUN_ID);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("http://localhost:3000/api/ingest/runs");
    expect(new Headers(init?.headers).get("authorization")).toBe(
      `Bearer ${TOKEN}`,
    );
    expect(JSON.parse(String(init?.body))).toEqual({
      target: "local",
      dryRun: true,
    });
  });

  it("puts a batch and reads each item's status", async () => {
    const results = [
      { ref: "wp:post:1", status: "created" },
      { ref: "wp:post:2", status: "error", error: "unknown author" },
    ];
    const { client, fetch } = clientFor(Response.json({ results }));

    const items = [{ ref: "wp:post:1" }, { ref: "wp:post:2" }];
    expect(await client.putBatch("/api/ingest/posts", RUN_ID, items)).toEqual(
      results,
    );
    expect(fetch.mock.calls[0][1]?.method).toBe("PUT");
  });

  it("rejects a response it does not understand", async () => {
    const { client } = clientFor(
      Response.json({ results: [{ ref: "x", status: "maybe" }] }),
    );
    await expect(
      client.putBatch("/api/ingest/posts", RUN_ID, []),
    ).rejects.toThrow();
  });

  it("names the endpoint and status on a refusal, never the token", async () => {
    const { client } = clientFor(new Response(null, { status: 401 }));
    const error = await client.startRun("local", false).catch((e) => e);
    expect(String(error)).toContain("POST /api/ingest/runs answered 401");
    expect(String(error)).not.toContain(TOKEN);
  });
});
