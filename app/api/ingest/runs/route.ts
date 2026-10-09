import { db, ingestRuns } from "@/lib/db";
import { withIngest } from "@/lib/ingest/with-ingest";
import { parseStartRun, readJson } from "@/lib/ingest/runs";

// Starts an ingest run. Body: { target, dryRun? }.
export const POST = withIngest(async (request) => {
  const parsed = parseStartRun(await readJson(request));
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  const [run] = await db
    .insert(ingestRuns)
    .values(parsed.value)
    .returning({ id: ingestRuns.id, status: ingestRuns.status });
  return Response.json(run, { status: 201 });
});
