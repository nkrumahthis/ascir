import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { findUnguarded } from "@/auth/find-unguarded";

const ROOT = join(__dirname, "..");
const SCANNED = ["app", "auth", "components", "lib", "hooks"];

// Handlers that guard themselves. Each entry needs a reason.
const EXEMPT: Record<string, string> = {
  // Sign-in, sign-up and session endpoints: there is no user to check yet.
  "app/api/auth/[...all]/route.ts": "Better Auth handler",
};

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !entry.name.endsWith(".test.ts")
      ? [path]
      : [];
  });
}

describe("every server action and route handler calls can()", () => {
  const files = SCANNED.flatMap((dir) => sourceFiles(join(ROOT, dir))).map(
    (path) => relative(ROOT, path).replaceAll("\\", "/"),
  );

  it("scans the source files", () => {
    expect(files).toContain("auth/can.ts");
    expect(files).toContain("app/api/auth/[...all]/route.ts");
  });

  it("has no unguarded handlers", () => {
    const unguarded = files
      .filter((file) => !(file in EXEMPT))
      .flatMap((file) =>
        findUnguarded(file, readFileSync(join(ROOT, file), "utf8")),
      );
    expect(unguarded).toEqual([]);
  });
});

describe("findUnguarded", () => {
  it("flags exports of a 'use server' file that skip can()", () => {
    const code = `"use server";
      import { can } from "@/auth/can";
      export async function guarded() { if (!can(user, "post:create")) throw 1; }
      export async function open() { await db.delete(); }
      export const arrow = async () => { await db.delete(); };
      async function renamed() {}
      export { renamed as alias };`;
    expect(findUnguarded("app/actions.ts", code).map((u) => u.name)).toEqual([
      "open",
      "arrow",
      "alias",
    ]);
  });

  it("flags route handler methods that skip can()", () => {
    const code = `
      export async function GET() { if (!can(u, "settings:update")) return; }
      export async function POST() { return new Response(); }
      export const DELETE = async () => new Response();
      export function helper() {}`;
    expect(findUnguarded("app/x/route.ts", code).map((u) => u.name)).toEqual([
      "POST",
      "DELETE",
    ]);
  });

  it("flags inline server actions that skip can()", () => {
    const code = `
      export default function Page() {
        async function save() { "use server"; await db.save(); }
        const remove = async () => { "use server"; if (!can(u, "post:delete")) return; };
        return null;
      }`;
    expect(findUnguarded("app/page.tsx", code).map((u) => u.name)).toEqual([
      "save",
    ]);
  });

  it("ignores ordinary modules", () => {
    const code = `export async function load() { return db.all(); }`;
    expect(findUnguarded("lib/data.ts", code)).toEqual([]);
  });
});
