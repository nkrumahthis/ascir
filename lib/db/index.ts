import "server-only";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Db = PostgresJsDatabase<typeof schema>;

// Reuse the connection across hot reloads in dev.
const globalForDb = globalThis as unknown as { pg?: postgres.Sql };
let instance: Db | undefined;

// Connect on first use, not on import, so `next build` (which imports route
// modules) works in environments without DB_URL, such as Vercel previews.
function getDb(): Db {
  if (instance) return instance;
  const url = process.env.DB_URL;
  if (!url) throw new Error("DB_URL is not set");
  const client = globalForDb.pg ?? postgres(url, { max: 10 });
  if (process.env.NODE_ENV !== "production") globalForDb.pg = client;
  instance = drizzle(client, { schema });
  return instance;
}

export const db = new Proxy({} as Db, {
  get: (_target, prop) => Reflect.get(getDb(), prop),
});
export * from "./schema";
