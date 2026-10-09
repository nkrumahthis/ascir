import { and, eq } from "drizzle-orm";
import { db, ingestRuns } from "@/lib/db";
import { withIngest } from "@/lib/ingest/with-ingest";
import { isRunId, parseCompleteRun, readJson } from "@/lib/ingest/runs";

type Context = { params: Promise<{ id: string }> };

// Closes a running ingest run. Body: { counts, report?, status? }.
export const POST = withIngest<Context>(async (request, { params }) => {
  const { id } = await params;
  if (!isRunId(id)) return Response.json({ error: "not found" }, { status: 404 });

  const parsed = parseCompleteRun(await readJson(request));
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  // Only a running run can close, so a retried complete can't overwrite it.
  const [run] = await db
    .update(ingestRuns)
    .set({ ...parsed.value, finishedAt: new Date() })
    .where(and(eq(ingestRuns.id, id), eq(ingestRuns.status, "running")))
    .returning();
  if (run) return Response.json(run);

  const [existing] = await db
    .select({ status: ingestRuns.status })
    .from(ingestRuns)
    .where(eq(ingestRuns.id, id));
  return existing
    ? Response.json({ error: `run is already ${existing.status}` }, { status: 409 })
    : Response.json({ error: "not found" }, { status: 404 });
});
