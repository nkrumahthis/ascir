// Better Auth tables. Constraint and index names match the tables Better
// Auth created before Drizzle, so the baseline migration is a no-op there.

import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
// Relative import: drizzle-kit does not resolve the @/ alias.
import { DEFAULT_ROLE, ROLES } from "../../auth/can";

const createdAt = () =>
  timestamp({ withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull();

export const user = pgTable(
  "user",
  {
    id: text().primaryKey(),
    name: text().notNull(),
    email: text().notNull(),
    emailVerified: boolean().notNull(),
    image: text(),
    // One of ROLES in auth/can.ts. Only change it through can().
    role: text().default(DEFAULT_ROLE).notNull(),
    createdAt: createdAt(),
    updatedAt: createdAt(),
  },
  (table) => [
    unique("user_email_key").on(table.email),
    check(
      "user_role_check",
      sql`${table.role} IN (${sql.raw(ROLES.map((r) => `'${r}'`).join(", "))})`,
    ),
  ],
);

export const session = pgTable(
  "session",
  {
    id: text().primaryKey(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    token: text().notNull(),
    createdAt: createdAt(),
    updatedAt: timestamp({ withTimezone: true }).notNull(),
    ipAddress: text(),
    userAgent: text(),
    userId: text().notNull(),
  },
  (table) => [
    index("session_userId_idx").on(table.userId),
    foreignKey({
      name: "session_userId_fkey",
      columns: [table.userId],
      foreignColumns: [user.id],
    }).onDelete("cascade"),
    unique("session_token_key").on(table.token),
  ],
);

export const account = pgTable(
  "account",
  {
    id: text().primaryKey(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: text().notNull(),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    password: text(),
    createdAt: createdAt(),
    updatedAt: timestamp({ withTimezone: true }).notNull(),
  },
  (table) => [
    index("account_userId_idx").on(table.userId),
    foreignKey({
      name: "account_userId_fkey",
      columns: [table.userId],
      foreignColumns: [user.id],
    }).onDelete("cascade"),
  ],
);

export const verification = pgTable(
  "verification",
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: createdAt(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);
