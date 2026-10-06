import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { Pool } from "pg";

export const auth = betterAuth({
  database: new Pool({ connectionString: process.env.DB_URL }),
  emailAndPassword: {
    enabled: true,
  },
  // nextCookies must be the last plugin so server actions can set cookies
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
