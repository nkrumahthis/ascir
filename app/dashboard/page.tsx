import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  async function signOutAction() {
    "use server";
    await auth.api.signOut({ headers: await headers() });
    redirect("/");
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-2">Signed in as {session.user.email}</p>
      <form action={signOutAction} className="mt-6">
        <button className="rounded border px-3 py-2">Sign out</button>
      </form>
    </main>
  );
}
