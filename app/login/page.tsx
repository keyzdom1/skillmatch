"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase";
import GoogleSignInButton from "@/components/GoogleSignInButton";

const inputClass =
  "w-full rounded-control border border-slate/40 bg-card px-3 py-2 text-sm text-ink outline-none focus:border-ink";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/matches";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const supabase = createBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setSubmitting(false);
    } else {
      router.push(next);
      router.refresh();
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 py-10">
      <div>
        <h1 className="font-display text-3xl font-bold">Welcome back</h1>
        <p className="mt-1 text-sm text-ink/60">
          Log in to check your matches.
        </p>
      </div>
      <GoogleSignInButton />
      <div className="flex items-center gap-3 text-xs text-ink/40">
        <span className="h-px flex-1 bg-slate/30" />
        or with email
        <span className="h-px flex-1 bg-slate/30" />
      </div>
      <form onSubmit={handleSubmit} className="card flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="you@example.com"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            placeholder="••••••••"
          />
        </label>
        {error && <p className="text-sm font-medium text-coral">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>
      <p className="text-center text-sm text-ink/60">
        New to SkillMatch?{" "}
        <Link href="/signup" className="font-medium text-teal hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
