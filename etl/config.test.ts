import { describe, expect, it } from "vitest";
import { parseIngestConfig } from "@/etl/config";

const env = (url: string, token = "s3cret-token") =>
  `INGEST_URL=${url}\nINGEST_TOKEN=${token}\n`;

describe("parseIngestConfig", () => {
  it("accepts a localhost URL for --target=local", () => {
    expect(parseIngestConfig(env("http://localhost:3000/"), "local")).toEqual({
      ok: true,
      value: { url: "http://localhost:3000", token: "s3cret-token" },
    });
  });

  it("accepts an https URL for preview", () => {
    const parsed = parseIngestConfig(
      env("https://ascir-x.vercel.app"),
      "preview",
    );
    expect(parsed).toMatchObject({ ok: true });
  });

  it.each([
    [env("https://ascir-x.vercel.app"), "local", "is not localhost"],
    [env("http://localhost:3000"), "preview", "is localhost"],
    [env("http://ascir-x.vercel.app"), "preview", "must use https"],
    [env("http://localhost:3000", ""), "local", "INGEST_TOKEN is missing"],
    ["INGEST_TOKEN=s3cret-token\n", "local", "INGEST_URL is missing"],
  ] as const)("rejects %j for %s", (text, target, error) => {
    const parsed = parseIngestConfig(text, target);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error).toContain(error);
  });

  it("never puts the token in an error", () => {
    const parsed = parseIngestConfig(env("https://x.vercel.app"), "local");
    expect(JSON.stringify(parsed)).not.toContain("s3cret-token");
  });
});
