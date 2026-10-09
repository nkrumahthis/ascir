import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const memberType = pgEnum("member_type", ["team", "board"]);
export const postType = pgEnum("post_type", ["blog", "news"]);

export const members = pgTable("members", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  role: text("role").notNull(),
  bio: text("bio").notNull().default(""),
  image: text("image"),
  order: integer("order").notNull().default(0),
  type: memberType("type").notNull(),
});

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  content: text("content").notNull(),
  excerpt: text("excerpt").notNull().default(""),
  featuredImage: text("featured_image"),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  type: postType("type").notNull(),
});

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  content: text("content").notNull(),
  excerpt: text("excerpt").notNull().default(""),
  date: timestamp("date", { withTimezone: true }).notNull(),
  location: text("location").notNull().default(""),
  featuredImage: text("featured_image"),
});

export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
});

export const postTags = pgTable(
  "post_tags",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.postId, t.tagId] })],
);
export const ingestRunStatus = pgEnum("ingest_run_status", [
  "running",
  "completed",
  "failed",
]);

// One row per ETL run that pushes ascir.org content in through /api/ingest.
export const ingestRuns = pgTable("ingest_run", {
  id: uuid("id").primaryKey().defaultRandom(),
  target: text("target").notNull(),
  dryRun: boolean("dry_run").notNull().default(false),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  status: ingestRunStatus("status").notNull().default("running"),
  counts: jsonb("counts").$type<Record<string, number>>().notNull().default({}),
  report: jsonb("report"),
});

export * from "./auth-schema";
