// The only permission check in the codebase. Every server action and route
// handler calls can() before doing any work; the sidebar uses it to hide
// links. Keep this file free of server-only imports so the client can use it.

export const ROLES = [
  "subscriber",
  "author",
  "editor",
  "admin",
  "super_admin",
] as const;

export type Role = (typeof ROLES)[number];

export const DEFAULT_ROLE: Role = "subscriber";

export function isRole(value: unknown): value is Role {
  return ROLES.includes(value as Role);
}

// Higher rank includes every permission of the ranks below it.
function rank(role: Role) {
  return ROLES.indexOf(role);
}

function atLeast(role: Role, min: Role) {
  return rank(role) >= rank(min);
}

export type CanUser = { id: string; role?: string | null };

// A post belongs to the users linked (through a person record) to its
// authors. An empty list means the post is bylined ASCIR, so only
// editors and above may touch it.
export type PostResource = { authorUserIds: readonly string[] };
// A person record, optionally linked to a login.
export type PersonResource = { userId: string | null };
export type AccountResource = { userId: string };
export type RoleChangeResource = { from: Role; to: Role };

type Resources = {
  "account:manage": AccountResource;
  "post:create": never;
  "post:update": PostResource;
  "post:publish": PostResource;
  "post:delete": PostResource;
  "person:create": never;
  "person:update": PersonResource;
  "person:delete": PersonResource;
  "event:create": never;
  "event:update": never;
  "event:delete": never;
  "partner:create": never;
  "partner:update": never;
  "partner:delete": never;
  "user:invite": never;
  "user:set-role": RoleChangeResource;
  "settings:update": never;
};

export type Action = keyof Resources;

export const ACTIONS = [
  "account:manage",
  "post:create",
  "post:update",
  "post:publish",
  "post:delete",
  "person:create",
  "person:update",
  "person:delete",
  "event:create",
  "event:update",
  "event:delete",
  "partner:create",
  "partner:update",
  "partner:delete",
  "user:invite",
  "user:set-role",
  "settings:update",
] as const satisfies readonly Action[];

// Rules receive the resource when the caller has one. Without a resource,
// a rule must only grant what the role may do to *every* such resource,
// so forgetting to pass one can never widen access.
type Rule<A extends Action> = (
  role: Role,
  userId: string,
  resource: Resources[A] | undefined,
) => boolean;

const rules: { [A in Action]: Rule<A> } = {
  // Everyone manages their own account.
  "account:manage": (_role, userId, account) => account?.userId === userId,

  // Author and above write and publish their own posts.
  // Editor and above edit any post. Admin and above delete content.
  "post:create": (role) => atLeast(role, "author"),
  "post:update": (role, userId, post) =>
    atLeast(role, "editor") ||
    (atLeast(role, "author") && !!post?.authorUserIds.includes(userId)),
  "post:publish": (role, userId, post) =>
    atLeast(role, "editor") ||
    (atLeast(role, "author") && !!post?.authorUserIds.includes(userId)),
  "post:delete": (role) => atLeast(role, "admin"),

  // Author and above edit their own profile; editor and above edit anyone.
  "person:create": (role) => atLeast(role, "editor"),
  "person:update": (role, userId, person) =>
    atLeast(role, "editor") ||
    (atLeast(role, "author") && person?.userId === userId),
  "person:delete": (role) => atLeast(role, "admin"),

  "event:create": (role) => atLeast(role, "editor"),
  "event:update": (role) => atLeast(role, "editor"),
  "event:delete": (role) => atLeast(role, "admin"),

  "partner:create": (role) => atLeast(role, "editor"),
  "partner:update": (role) => atLeast(role, "editor"),
  "partner:delete": (role) => atLeast(role, "admin"),

  "user:invite": (role) => atLeast(role, "admin"),
  "settings:update": (role) => atLeast(role, "admin"),

  // Only a super admin grants (or takes away) admin or super admin.
  // Admins may move other users between subscriber, author and editor.
  "user:set-role": (role, _userId, change) => {
    if (role === "super_admin") return true;
    if (role !== "admin" || !change) return false;
    return !atLeast(change.from, "admin") && !atLeast(change.to, "admin");
  },
};

export function can<A extends Action>(
  user: CanUser | null | undefined,
  action: A,
  resource?: Resources[A],
): boolean {
  if (!user) return false;
  const role = isRole(user.role) ? user.role : DEFAULT_ROLE;
  return rules[action](role, user.id, resource);
}
