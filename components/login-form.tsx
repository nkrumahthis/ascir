"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { signIn, signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter();
  const next = useSearchParams().get("next") ?? "/dashboard";
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const isSignIn = mode === "sign-in";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));

    const { error } = isSignIn
      ? await signIn.email({ email, password })
      : await signUp.email({ email, password, name: String(form.get("name")) });

    if (error) {
      setPending(false);
      setError(error.message ?? "Something went wrong");
      return;
    }
    router.push(next);
    router.refresh();
  }

  function toggleMode() {
    setError(null);
    setMode(isSignIn ? "sign-up" : "sign-in");
  }

  return (
    <form
      onSubmit={onSubmit}
      className={cn("flex flex-col gap-6", className)}
      {...props}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="font-heading text-2xl font-bold">
            {isSignIn ? "Login to your account" : "Create an account"}
          </h1>
          <p className="text-sm text-balance text-muted-foreground">
            {isSignIn
              ? "Enter your email below to login to your account"
              : "Enter your details below to create your account"}
          </p>
        </div>
        {!isSignIn && (
          <Field>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input id="name" name="name" autoComplete="name" required />
          </Field>
        )}
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="m@example.com"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={isSignIn ? "current-password" : "new-password"}
            minLength={8}
            required
          />
          {!isSignIn && (
            <FieldDescription>Must be at least 8 characters.</FieldDescription>
          )}
        </Field>
        {error && <FieldError role="alert">{error}</FieldError>}
        <Field>
          <Button type="submit" disabled={pending}>
            {pending ? "Please wait…" : isSignIn ? "Login" : "Create account"}
          </Button>
          <FieldDescription className="text-center">
            {isSignIn ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={toggleMode}
              className="underline underline-offset-4"
            >
              {isSignIn ? "Sign up" : "Login"}
            </button>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
