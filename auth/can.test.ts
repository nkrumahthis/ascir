import { describe, expect, it } from "vitest";
import { ACTIONS, ROLES, can, type Action, type Role } from "@/auth/can";
import { visibleNav } from "@/components/nav";

const ME = "user-me";
const OTHER = "user-other";

const own = { authorUserIds: [ME] };
const coAuthored = { authorUserIds: [OTHER, ME] };
const others = { authorUserIds: [OTHER] };
const ascir = { authorUserIds: [] }; // bylined ASCIR

const everyone: Role[] = [...ROLES];
const authorUp: Role[] = ["author", "editor", "admin", "super_admin"];
const editorUp: Role[] = ["editor", "admin", "super_admin"];
const adminUp: Role[] = ["admin", "super_admin"];
const superOnly: Role[] = ["super_admin"];
const nobody: Role[] = [];

type Case = {
  name: string;
  action: Action;
  resource?: unknown;
  allowed: Role[];
};

// Every role is checked against every row: roles not listed must be denied.
const cases: Case[] = [
  { name: "own account", action: "account:manage", resource: { userId: ME }, allowed: everyone },
  { name: "someone else's account", action: "account:manage", resource: { userId: OTHER }, allowed: nobody },
  { name: "account without resource", action: "account:manage", allowed: nobody },

  { name: "write a post", action: "post:create", allowed: authorUp },

  { name: "edit own post", action: "post:update", resource: own, allowed: authorUp },
  { name: "edit co-authored post", action: "post:update", resource: coAuthored, allowed: authorUp },
  { name: "edit someone else's post", action: "post:update", resource: others, allowed: editorUp },
  { name: "edit ASCIR-bylined post", action: "post:update", resource: ascir, allowed: editorUp },
  { name: "edit post without resource", action: "post:update", allowed: editorUp },

  { name: "publish own post", action: "post:publish", resource: own, allowed: authorUp },
  { name: "publish someone else's post", action: "post:publish", resource: others, allowed: editorUp },
  { name: "publish ASCIR-bylined post", action: "post:publish", resource: ascir, allowed: editorUp },
  { name: "publish post without resource", action: "post:publish", allowed: editorUp },

  { name: "delete own post", action: "post:delete", resource: own, allowed: adminUp },
  { name: "delete someone else's post", action: "post:delete", resource: others, allowed: adminUp },

  { name: "add a person", action: "person:create", allowed: editorUp },
  { name: "edit own profile", action: "person:update", resource: { userId: ME }, allowed: authorUp },
  { name: "edit someone else's profile", action: "person:update", resource: { userId: OTHER }, allowed: editorUp },
  { name: "edit person with no login", action: "person:update", resource: { userId: null }, allowed: editorUp },
  { name: "edit person without resource", action: "person:update", allowed: editorUp },
  { name: "delete own profile", action: "person:delete", resource: { userId: ME }, allowed: adminUp },

  { name: "add an event", action: "event:create", allowed: editorUp },
  { name: "edit an event", action: "event:update", allowed: editorUp },
  { name: "delete an event", action: "event:delete", allowed: adminUp },

  { name: "add a partner", action: "partner:create", allowed: editorUp },
  { name: "edit a partner", action: "partner:update", allowed: editorUp },
  { name: "delete a partner", action: "partner:delete", allowed: adminUp },

  { name: "invite a user", action: "user:invite", allowed: adminUp },
  { name: "change settings", action: "settings:update", allowed: adminUp },

  { name: "promote subscriber to author", action: "user:set-role", resource: { from: "subscriber", to: "author" }, allowed: adminUp },
  { name: "promote author to editor", action: "user:set-role", resource: { from: "author", to: "editor" }, allowed: adminUp },
  { name: "demote editor to subscriber", action: "user:set-role", resource: { from: "editor", to: "subscriber" }, allowed: adminUp },
  { name: "grant admin", action: "user:set-role", resource: { from: "editor", to: "admin" }, allowed: superOnly },
  { name: "grant super admin", action: "user:set-role", resource: { from: "subscriber", to: "super_admin" }, allowed: superOnly },
  { name: "demote an admin", action: "user:set-role", resource: { from: "admin", to: "editor" }, allowed: superOnly },
  { name: "demote a super admin", action: "user:set-role", resource: { from: "super_admin", to: "admin" }, allowed: superOnly },
  { name: "set role without resource", action: "user:set-role", allowed: superOnly },
];

describe("can()", () => {
  it("has a case for every action", () => {
    const covered = new Set(cases.map((c) => c.action));
    expect(ACTIONS.filter((a) => !covered.has(a))).toEqual([]);
  });

  describe.each(cases)("$name ($action)", ({ action, resource, allowed }) => {
    it.each(ROLES)("%s", (role) => {
      // The table mixes actions, so resource shapes are checked by the
      // rows above rather than by the compiler here.
      const result = can({ id: ME, role }, action, resource as never);
      expect(result).toBe(allowed.includes(role));
    });
  });

  it("denies a signed-out visitor everything", () => {
    for (const action of ACTIONS) {
      expect(can(null, action)).toBe(false);
      expect(can(undefined, action)).toBe(false);
    }
  });

  it("treats a missing or unknown role as subscriber", () => {
    for (const role of [undefined, null, "", "root", "ADMIN"]) {
      for (const { action, resource, allowed } of cases) {
        expect(can({ id: ME, role }, action, resource as never)).toBe(
          allowed.includes("subscriber"),
        );
      }
    }
  });
});

describe("sidebar", () => {
  const labels = (role: Role) => {
    const { groups, footer } = visibleNav({ id: ME, role });
    return [
      ...groups.flatMap((g) => g.items.map((i) => i.label)),
      ...footer.map((i) => i.label),
    ];
  };

  it.each<[Role, string[]]>([
    ["subscriber", ["Dashboard", "View website", "Help"]],
    ["author", ["Dashboard", "Articles", "Research", "View website", "Help"]],
    ["editor", ["Dashboard", "Articles", "Research", "Events", "Team", "View website", "Help"]],
    ["admin", ["Dashboard", "Articles", "Research", "Events", "Team", "View website", "Help", "Settings"]],
    ["super_admin", ["Dashboard", "Articles", "Research", "Events", "Team", "View website", "Help", "Settings"]],
  ])("%s sees only links their role can use", (role, expected) => {
    expect(labels(role)).toEqual(expected);
  });

  it("drops groups left empty", () => {
    const { groups } = visibleNav({ id: ME, role: "subscriber" });
    expect(groups.map((g) => g.title)).toEqual(["Overview", "Centre"]);
  });
});
