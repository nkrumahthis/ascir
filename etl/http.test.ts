import { describe, expect, it, vi } from "vitest";
import { fetchWithRetry, type Fetch } from "@/etl/http";

function respond(...statuses: (number | Error)[]) {
  const fetch = vi.fn<Fetch>();
  for (const status of statuses) {
    if (status instanceof Error) fetch.mockRejectedValueOnce(status);
    else fetch.mockResolvedValueOnce(new Response(null, { status }));
  }
  return fetch;
}

describe("fetchWithRetry", () => {
  it("retries 5xx with growing pauses until it succeeds", async () => {
    const fetch = respond(502, 503, 200);
    const sleep = vi.fn(async () => {});

    const response = await fetchWithRetry(
      "https://x.test",
      {},
      { fetch, sleep },
    );

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls).toEqual([[1000], [2000]]);
  });

  it("does not retry 4xx", async () => {
    const fetch = respond(404);
    const response = await fetchWithRetry(
      "https://x.test",
      {},
      { fetch, sleep: async () => {} },
    );
    expect(response.status).toBe(404);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("returns the last 5xx when every attempt fails", async () => {
    const fetch = respond(500, 500, 500);
    const response = await fetchWithRetry(
      "https://x.test",
      {},
      { fetch, sleep: async () => {}, attempts: 3 },
    );
    expect(response.status).toBe(500);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("retries network errors and rethrows the last one", async () => {
    const fetch = respond(new Error("reset"), new Error("still down"));
    await expect(
      fetchWithRetry(
        "https://x.test",
        {},
        { fetch, sleep: async () => {}, attempts: 2 },
      ),
    ).rejects.toThrow("still down");
  });
});
