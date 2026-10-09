// Reads the ingest URL and token from .env.etl (git-ignored) and checks
// they fit the --target. Never prints the token.

import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { z } from "zod";

export type Target = "local" | "preview" | "production";
export type IngestConfig = { url: string; token: string };
type Parsed = { ok: true; value: IngestConfig } | { ok: false; error: string };

const envSchema = z.object({
  INGEST_URL: z.url({ protocol: /^https?$/ }),
  INGEST_TOKEN: z.string().min(1),
});

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function parseIngestConfig(text: string, target: Target): Parsed {
  const parsed = envSchema.safeParse(parseEnv(text));
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? "config");
    return { ok: false, error: `.env.etl: ${field} is missing or not valid` };
  }
  const url = new URL(parsed.data.INGEST_URL);
  const isLocal = LOCAL_HOSTS.has(url.hostname);
  // A wrong pairing would push to the wrong database, so refuse it.
  if ((target === "local") !== isLocal) {
    return {
      ok: false,
      error: `INGEST_URL is ${isLocal ? "" : "not "}localhost, but --target=${target}`,
    };
  }
  if (!isLocal && url.protocol !== "https:") {
    return { ok: false, error: "INGEST_URL must use https outside localhost" };
  }
  return {
    ok: true,
    value: { url: url.origin, token: parsed.data.INGEST_TOKEN },
  };
}

export async function loadIngestConfig(target: Target, file = ".env.etl") {
  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch (error) {
    throw new Error(
      `${file} not found; ask Nkrumah for the ingest URL and token`,
      {
        cause: error,
      },
    );
  }
  const parsed = parseIngestConfig(text, target);
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value;
}
