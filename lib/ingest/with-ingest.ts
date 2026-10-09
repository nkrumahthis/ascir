import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

// Guards the temporary /api/ingest endpoints the ascir.org ETL pushes to.
// 404 unless INGEST_ENABLED is "true", so the routes look absent when off.
// 401 unless the Bearer token matches INGEST_TOKEN. Never log either.

type Handler<C> = (request: Request, context: C) => Promise<Response>;

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

// Hashing first gives equal-length buffers, so the compare leaks no length.
export function tokenMatches(header: string | null, expected: string | undefined) {
  if (!header || !expected) return false;
  const match = /^Bearer (.+)$/.exec(header);
  if (!match) return false;
  return timingSafeEqual(digest(match[1]), digest(expected));
}

export function withIngest<C>(handler: Handler<C>): Handler<C> {
  return async (request, context) => {
    if (process.env.INGEST_ENABLED !== "true") {
      return new Response(null, { status: 404 });
    }
    if (!tokenMatches(request.headers.get("authorization"), process.env.INGEST_TOKEN)) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    return handler(request, context);
  };
}
