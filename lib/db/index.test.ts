import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("db", () => {
  it("imports without DB_URL and throws on first use", async () => {
    vi.stubEnv("DB_URL", undefined);
    const { db } = await import("@/lib/db");
    expect(() => db.select()).toThrow("DB_URL is not set");
  });

  it("builds queries through the lazy proxy without connecting", async () => {
    vi.stubEnv("DB_URL", "postgres://user:pass@127.0.0.1:1/none");
    const { db, ingestRuns } = await import("@/lib/db");
    const { sql } = db.select().from(ingestRuns).toSQL();
    expect(sql).toContain('from "ingest_run"');
  });
});
