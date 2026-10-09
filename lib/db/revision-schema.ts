// Edit history: one row per save of a post, person, event or organization.

import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const ENTITY_TYPES = [
  "post",
  "person",
  "event",
  "organization",
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];

// Add to every table that keeps history. Each save bumps it, and a save
// carrying an older number is refused (see lib/revisions).
export const versionColumn = () => integer("version").notNull().default(1);

export const entityType = pgEnum("entity_type", ENTITY_TYPES);

export const revisions = pgTable(
  "revision",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityType: entityType("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    // The full record as it was saved, including its version.
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
    note: text("note"),
    // Null for saves no person made, such as the ascir.org import.
    // Kept when the user is deleted so the history survives.
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("revision_entity_idx").on(t.entityType, t.entityId, t.createdAt),
  ],
);
