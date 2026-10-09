// Extract: downloads everything from ascir.org into etl/raw, untouched.
// Requests go one at a time with a pause between them.

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { fetchWithRetry, sleep, type Fetch, type Sleep } from "@/etl/http";
import { RAW_DIR } from "@/etl/paths";

export const SITE = "https://ascir.org";

type Source = { name: string; path: string; kind: "wp" | "tribe" };

export const SOURCES: readonly Source[] = [
  { name: "posts", path: "wp/v2/posts", kind: "wp" },
  { name: "pages", path: "wp/v2/pages", kind: "wp" },
  { name: "media", path: "wp/v2/media", kind: "wp" },
  { name: "categories", path: "wp/v2/categories", kind: "wp" },
  { name: "users", path: "wp/v2/users", kind: "wp" },
  { name: "events", path: "tribe/events/v1/events", kind: "tribe" },
];

export const ABOUT_PAGE = "about-us";

export type ExtractDeps = { fetch?: Fetch; sleep?: Sleep; delayMs?: number };

type Page = { items: unknown[]; total: number; totalPages: number };

const wpBody = z.array(z.unknown());
const tribeBody = z.object({
  events: z.array(z.unknown()),
  total: z.number().int(),
  total_pages: z.number().int(),
});

export type Raw = {
  records: Record<string, unknown[]>;
  aboutHtml: string;
};

// What ascir.org said it has, per source. WordPress counts items it does
// not show the public (such as attachments of private posts), so this
// can be higher than what was received.
export type Reported = Record<string, number>;

export async function extract(
  deps: ExtractDeps = {},
): Promise<{ raw: Raw; reported: Reported }> {
  const get = politeGet(deps);
  const records: Record<string, unknown[]> = {};
  const reported: Reported = {};
  for (const source of SOURCES) {
    const result = await fetchAll(source, get);
    records[source.name] = result.items;
    reported[source.name] = result.reported;
  }
  const about = await get(`${SITE}/${ABOUT_PAGE}/`);
  return { raw: { records, aboutHtml: await about.text() }, reported };
}

// Every request after the first waits delayMs, then retries on 5xx.
function politeGet(deps: ExtractDeps) {
  const pause = deps.sleep ?? sleep;
  let first = true;
  return async (url: string) => {
    if (!first) await pause(deps.delayMs ?? 500);
    first = false;
    const response = await fetchWithRetry(url, {}, deps);
    if (!response.ok) {
      throw new Error(`ascir.org answered ${response.status} for ${url}`);
    }
    return response;
  };
}

async function fetchAll(
  source: Source,
  get: (url: string) => Promise<Response>,
): Promise<{ items: unknown[]; reported: number }> {
  const items: unknown[] = [];
  let reported = 0;
  for (let page = 1, totalPages = 1; page <= totalPages; page++) {
    const result = await readPage(source, await get(pageUrl(source, page)));
    items.push(...result.items);
    reported = result.total;
    totalPages = result.totalPages;
  }
  return { items, reported };
}

export function pageUrl(source: Source, page: number) {
  const url = new URL(`${SITE}/wp-json/${source.path}`);
  url.searchParams.set("page", String(page));
  if (source.kind === "wp") {
    url.searchParams.set("per_page", "100");
  } else {
    url.searchParams.set("per_page", "50");
    // The events API lists only upcoming events unless given a start date.
    url.searchParams.set("start_date", "2000-01-01");
  }
  return url.toString();
}

async function readPage(source: Source, response: Response): Promise<Page> {
  const body: unknown = await response.json();
  if (source.kind === "tribe") {
    const page = tribeBody.parse(body);
    return {
      items: page.events,
      total: page.total,
      totalPages: page.total_pages,
    };
  }
  return {
    items: wpBody.parse(body),
    total: headerInt(response, "x-wp-total"),
    totalPages: headerInt(response, "x-wp-totalpages"),
  };
}

function headerInt(response: Response, name: string) {
  const value = Number(response.headers.get(name));
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`ascir.org sent no valid ${name} header`);
  }
  return value;
}

export type Counts = Record<string, { received: number; reported: number }>;

export async function writeRaw(raw: Raw, reported: Reported, dir = RAW_DIR) {
  await mkdir(dir, { recursive: true });
  const counts: Counts = {};
  for (const [name, items] of Object.entries(raw.records)) {
    counts[name] = { received: items.length, reported: reported[name] ?? 0 };
    await writeFile(join(dir, `${name}.json`), JSON.stringify(items, null, 2));
  }
  await writeFile(join(dir, `${ABOUT_PAGE}.html`), raw.aboutHtml);
  const manifest = { fetchedAt: new Date().toISOString(), counts };
  await writeFile(
    join(dir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
  );
  return counts;
}
