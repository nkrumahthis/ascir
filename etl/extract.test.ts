import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { extract, pageUrl, SOURCES, writeRaw } from "@/etl/extract";
import type { Fetch, Sleep } from "@/etl/http";
import posts from "@/etl/fixtures/posts.json";

const media = Array.from({ length: 150 }, (_, i) => ({ id: i + 1 }));
const events = [{ id: 1 }, { id: 2 }];

// A fake ascir.org: posts from the saved fixtures, media over two pages,
// events from the events API, and one 503 to retry.
function fakeSite() {
  let failedOnce = false;
  return vi.fn<Fetch>(async (input) => {
    const url = new URL(String(input));
    const page = Number(url.searchParams.get("page"));
    if (url.pathname === "/about-us/") return new Response("<h1>About</h1>");
    if (url.pathname.endsWith("/tribe/events/v1/events")) {
      return Response.json({ events, total: 2, total_pages: 1 });
    }
    if (url.pathname.endsWith("/wp/v2/media")) {
      if (page === 2 && !failedOnce) {
        failedOnce = true;
        return new Response(null, { status: 503 });
      }
      // WordPress counts 3 media items it does not show the public.
      return wpPage(media.slice((page - 1) * 100, page * 100), 153, 2);
    }
    if (url.pathname.endsWith("/wp/v2/posts")) return wpPage(posts, 4, 1);
    return wpPage([], 0, 1);
  });
}

function wpPage(items: unknown[], total: number, totalPages: number) {
  return Response.json(items, {
    headers: {
      "x-wp-total": String(total),
      "x-wp-totalpages": String(totalPages),
    },
  });
}

let dir: string | undefined;
afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true });
  dir = undefined;
});

describe("extract", () => {
  it("follows pagination, retries 5xx and keeps items untouched", async () => {
    const fetch = fakeSite();
    const { raw, reported } = await extract({ fetch, sleep: async () => {} });

    expect(raw.records.posts).toEqual(posts);
    expect(raw.records.media).toEqual(media);
    expect(raw.records.events).toEqual(events);
    expect(raw.aboutHtml).toBe("<h1>About</h1>");
    expect(reported).toMatchObject({ posts: 4, media: 153, events: 2 });
  });

  it("goes one request at a time, pausing between them", async () => {
    const fetch = fakeSite();
    const sleep = vi.fn<Sleep>(async () => {});
    await extract({ fetch, sleep, delayMs: 500 });

    const pauses = sleep.mock.calls.filter(([ms]) => ms === 500);
    // Every request but the first pauses; the 503 retry pauses separately.
    const requests = fetch.mock.calls.length - 1; // minus the retried one
    expect(pauses).toHaveLength(requests - 1);
  });

  it("asks the events API for past events too", () => {
    const events = SOURCES.find((s) => s.kind === "tribe");
    if (!events) throw new Error("no events source");
    expect(pageUrl(events, 1)).toContain("start_date=2000-01-01");
  });

  it("stops on a 4xx", async () => {
    const fetch = vi.fn<Fetch>(async () => new Response(null, { status: 403 }));
    await expect(extract({ fetch, sleep: async () => {} })).rejects.toThrow(
      "ascir.org answered 403",
    );
  });
});

describe("writeRaw", () => {
  it("writes each source untouched, the About page and a manifest", async () => {
    dir = await mkdtemp(join(tmpdir(), "etl-raw-"));
    const { raw, reported } = await extract({
      fetch: fakeSite(),
      sleep: async () => {},
    });

    const counts = await writeRaw(raw, reported, dir);

    expect(counts.media).toEqual({ received: 150, reported: 153 });
    const read = async (name: string) =>
      readFile(join(dir ?? "", name), "utf8");
    expect(JSON.parse(await read("posts.json"))).toEqual(posts);
    expect(await read("about-us.html")).toBe("<h1>About</h1>");
    const manifest = JSON.parse(await read("manifest.json"));
    expect(manifest.counts.posts).toEqual({ received: 4, reported: 4 });
  });
});
