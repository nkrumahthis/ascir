import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import { auth } from "@/lib/auth";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">
        Welcome, {session.user.name || "there"}
      </h1>

      <Empty className="flex-1 rounded-xl border border-dashed border-border bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <LayoutDashboard />
          </EmptyMedia>
          <EmptyTitle>Nothing here yet</EmptyTitle>
          <EmptyDescription>
            Your dashboard is empty for now. New tools will show up here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </main>
  );
}
