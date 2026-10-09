import { eq } from "drizzle-orm";
import { db, ingestRuns } from "@/lib/db";
import { withIngest } from "@/lib/ingest/with-ingest";
import { isRunId } from "@/lib/ingest/runs";

type Context = { params: Promise<{ id: string }> };

// Returns an ingest run's status, counts and report.
export const GET = withIngest<Context>(async (_request, { params }) => {
  const { id } = await params;
  if (!isRunId(id)) return Response.json({ error: "not found" }, { status: 404 });

  const [run] = await db.select().from(ingestRuns).where(eq(ingestRuns.id, id));
  if (!run) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(run);
});
