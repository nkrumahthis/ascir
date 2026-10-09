// Parses the ETL's command-line flags.

import { z } from "zod";

export const RECORD_TYPES = [
  "media",
  "organizations",
  "people",
  "posts",
  "events",
  "redirects",
] as const;

export type RecordType = (typeof RECORD_TYPES)[number];

const flagsSchema = z.object({
  target: z.enum(["local", "preview", "production"]).optional(),
  dryRun: z.boolean(),
  cached: z.boolean(),
  only: z.array(z.enum(RECORD_TYPES)).optional(),
});

export type Flags = z.infer<typeof flagsSchema>;

type Parsed = { ok: true; value: Flags } | { ok: false; error: string };

const BOOLEAN_FLAGS: Record<string, "dryRun" | "cached"> = {
  "--dry-run": "dryRun",
  "--cached": "cached",
};

export function parseFlags(args: readonly string[]): Parsed {
  const raw: Record<string, unknown> = { dryRun: false, cached: false };
  for (const arg of args) {
    const [name, value] = arg.split("=", 2);
    if (name in BOOLEAN_FLAGS && value === undefined) {
      raw[BOOLEAN_FLAGS[name]] = true;
    } else if (name === "--target") {
      raw.target = value;
    } else if (name === "--only" && value) {
      raw.only = value.split(",");
    } else {
      return { ok: false, error: `unknown flag ${name}` };
    }
  }
  const parsed = flagsSchema.safeParse(raw);
  if (parsed.success) return { ok: true, value: parsed.data };
  // Name the flag, not the value it was given.
  const flag = String(parsed.error.issues[0]?.path[0] ?? "flags");
  return { ok: false, error: `--${kebab(flag)} is not valid` };
}

function kebab(name: string) {
  return name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}
