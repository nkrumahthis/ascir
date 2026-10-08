import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";

export const db = drizzle({
  client: new Pool({ connectionString: process.env.DB_URL }),
  schema,
});
