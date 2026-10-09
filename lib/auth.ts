import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { DEFAULT_ROLE } from "@/auth/can";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/auth-schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      // One of ROLES in auth/can.ts. input: false so sign-up and
      // updateUser can never set it; roles change only through a
      // server action guarded by can(user, "user:set-role").
      role: {
        type: "string",
        required: true,
        defaultValue: DEFAULT_ROLE,
        input: false,
      },
    },
  },
  // nextCookies must be the last plugin so server actions can set cookies
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
