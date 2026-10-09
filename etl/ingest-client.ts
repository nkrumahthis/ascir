// Talks to the app's /api/ingest endpoints with the machine token.
// Error messages name the endpoint and status, never the token.

import { z } from "zod";
import type { IngestConfig, Target } from "@/etl/config";
import { fetchWithRetry, type Fetch, type Sleep } from "@/etl/http";
import type { DumpItem } from "@/etl/registry";

export const ITEM_STATUSES = [
  "created",
  "updated",
  "unchanged",
  "error",
] as const;

const startedRun = z.object({ id: z.uuid() });
const batchResults = z.object({
  results: z.array(
    z.object({
      ref: z.string(),
      status: z.enum(ITEM_STATUSES),
      error: z.string().optional(),
    }),
  ),
});

export type ItemResult = z.infer<typeof batchResults>["results"][number];
export type Counts = Record<(typeof ITEM_STATUSES)[number], number>;

export type IngestClient = ReturnType<typeof createIngestClient>;

export function createIngestClient(
  config: IngestConfig,
  deps: { fetch?: Fetch; sleep?: Sleep } = {},
) {
  // PUTs are upserts keyed on ref, so retrying one after a 5xx is safe.
  async function send(method: string, path: string, body: unknown) {
    const response = await fetchWithRetry(
      `${config.url}${path}`,
      {
        method,
        headers: {
          authorization: `Bearer ${config.token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      },
      deps,
    );
    if (!response.ok) {
      throw new Error(`${method} ${path} answered ${response.status}`);
    }
    return response.json() as Promise<unknown>;
  }

  return {
    async startRun(target: Target, dryRun: boolean) {
      const body = await send("POST", "/api/ingest/runs", { target, dryRun });
      return startedRun.parse(body).id;
    },
    async putBatch(endpoint: string, runId: string, items: DumpItem[]) {
      const body = await send("PUT", endpoint, { runId, items });
      return batchResults.parse(body).results;
    },
    async completeRun(
      runId: string,
      status: "completed" | "failed",
      counts: Record<string, number>,
      report: unknown,
    ) {
      await send("POST", `/api/ingest/runs/${runId}/complete`, {
        status,
        counts,
        report,
      });
    },
  };
}
