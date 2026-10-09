// Request body parsing for the ingest run endpoints. Errors never echo input.

export type StartRun = { target: string; dryRun: boolean };
export type CompleteRun = {
  status: "completed" | "failed";
  counts: Record<string, number>;
  report: unknown;
};
type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isRunId(id: string) {
  return UUID.test(id);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseStartRun(body: unknown): Parsed<StartRun> {
  if (!isObject(body)) return { ok: false, error: "body must be an object" };
  const { target, dryRun = false } = body;
  if (typeof target !== "string" || !target.trim() || target.length > 100) {
    return { ok: false, error: "target must be a non-empty string" };
  }
  if (typeof dryRun !== "boolean") {
    return { ok: false, error: "dryRun must be a boolean" };
  }
  return { ok: true, value: { target: target.trim(), dryRun } };
}

export function parseCompleteRun(body: unknown): Parsed<CompleteRun> {
  if (!isObject(body)) return { ok: false, error: "body must be an object" };
  const { counts, report = null, status = "completed" } = body;
  if (
    !isObject(counts) ||
    !Object.values(counts).every(
      (n) => Number.isInteger(n) && (n as number) >= 0,
    )
  ) {
    return {
      ok: false,
      error: "counts must map names to non-negative integers",
    };
  }
  if (status !== "completed" && status !== "failed") {
    return { ok: false, error: 'status must be "completed" or "failed"' };
  }
  return {
    ok: true,
    value: { status, counts: counts as Record<string, number>, report },
  };
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
