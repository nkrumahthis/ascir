// fetch with retries on 5xx and network errors, and a pause helper for
// going easy on ascir.org.

export type Fetch = typeof fetch;
export type Sleep = (ms: number) => Promise<void>;

export const sleep: Sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export type RetryOptions = {
  attempts?: number;
  baseDelayMs?: number;
  fetch?: Fetch;
  sleep?: Sleep;
};

// 4xx responses come back as they are; only server and network failures
// are retried, waiting 1 s, 2 s, 4 s... between attempts.
export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  options: RetryOptions = {},
): Promise<Response> {
  const attempts = options.attempts ?? 4;
  const baseDelayMs = options.baseDelayMs ?? 1000;
  const doFetch = options.fetch ?? fetch;
  const pause = options.sleep ?? sleep;

  for (let attempt = 1; ; attempt++) {
    const last = attempt >= attempts;
    try {
      const response = await doFetch(url, init);
      if (response.status < 500 || last) return response;
    } catch (error) {
      if (last) throw error;
    }
    await pause(baseDelayMs * 2 ** (attempt - 1));
  }
}
