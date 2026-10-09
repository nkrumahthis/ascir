import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { tokenMatches, withIngest } = await import("@/lib/ingest/with-ingest");

const TOKEN = "test-token-not-a-secret";
const ok = vi.fn(async () => new Response("handled"));
const handler = withIngest(ok);

function call(authorization?: string) {
  const headers = authorization ? { authorization } : undefined;
  return handler(new Request("http://x/api/ingest/runs", { headers }), {});
}

afterEach(() => {
  vi.unstubAllEnvs();
  ok.mockClear();
});

describe("withIngest", () => {
  it("returns 404 when INGEST_ENABLED is not exactly 'true'", async () => {
    for (const value of [undefined, "", "false", "1", "TRUE"]) {
      vi.stubEnv("INGEST_ENABLED", value);
      vi.stubEnv("INGEST_TOKEN", TOKEN);
      expect((await call(`Bearer ${TOKEN}`)).status).toBe(404);
    }
    expect(ok).not.toHaveBeenCalled();
  });

  it("returns 401 without a matching Bearer token", async () => {
    vi.stubEnv("INGEST_ENABLED", "true");
    vi.stubEnv("INGEST_TOKEN", TOKEN);
    for (const header of [undefined, TOKEN, `Basic ${TOKEN}`, "Bearer wrong", `Bearer ${TOKEN}x`]) {
      expect((await call(header)).status).toBe(401);
    }
    expect(ok).not.toHaveBeenCalled();
  });

  it("fails closed when INGEST_TOKEN is unset or empty", async () => {
    vi.stubEnv("INGEST_ENABLED", "true");
    for (const value of [undefined, ""]) {
      vi.stubEnv("INGEST_TOKEN", value);
      expect((await call("Bearer ")).status).toBe(401);
      expect((await call("Bearer undefined")).status).toBe(401);
    }
    expect(ok).not.toHaveBeenCalled();
  });

  it("calls the handler with the right token", async () => {
    vi.stubEnv("INGEST_ENABLED", "true");
    vi.stubEnv("INGEST_TOKEN", TOKEN);
    const response = await call(`Bearer ${TOKEN}`);
    expect(await response.text()).toBe("handled");
    expect(ok).toHaveBeenCalledOnce();
  });
});

describe("tokenMatches", () => {
  it("compares tokens of different lengths without throwing", () => {
    expect(tokenMatches("Bearer a", "a-much-longer-token")).toBe(false);
    expect(tokenMatches("Bearer a-much-longer-token", "a")).toBe(false);
  });
});
