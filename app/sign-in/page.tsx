"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signUp } from "@/lib/auth-client";

function SignInForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") ?? "/dashboard";
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));

    const { error } =
      mode === "sign-in"
        ? await signIn.email({ email, password })
        : await signUp.email({ email, password, name: String(form.get("name")) });

    setPending(false);
    if (error) {
      setError(error.message ?? "Something went wrong");
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-6 text-2xl font-semibold">
        {mode === "sign-in" ? "Sign in" : "Create an account"}
      </h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        {mode === "sign-up" && (
          <input name="name" placeholder="Name" required className="rounded border px-3 py-2" />
        )}
        <input name="email" type="email" placeholder="Email" required className="rounded border px-3 py-2" />
        <input
          name="password"
          type="password"
          placeholder="Password"
          minLength={8}
          required
          className="rounded border px-3 py-2"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={pending} className="rounded bg-black px-3 py-2 text-white disabled:opacity-50">
          {pending ? "…" : mode === "sign-in" ? "Sign in" : "Sign up"}
        </button>
      </form>
      <button
        type="button"
        onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
        className="mt-4 text-sm underline"
      >
        {mode === "sign-in" ? "Need an account? Sign up" : "Have an account? Sign in"}
      </button>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
