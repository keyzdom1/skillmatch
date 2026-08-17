"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase";
import GoogleSignInButton from "@/components/GoogleSignInButton";

const inputClass =
  "w-full rounded-control border border-slate/40 bg-card px-3 py-2 text-sm text-ink outline-none focus:border-ink";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);
    const supabase = createBrowserClient();
    const origin = window.location.origin;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setSubmitting(false);
      return;
    }

    if (data.session) {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName }),
      });
      if (res.ok) {
        router.push("/profile");
        router.refresh();
        return;
      }
    }

    setMessage(
      "Check your email for a confirmation link, then log in to build your profile."
    );
    setSubmitting(false);
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 py-10">
      <div>
        <h1 className="font-display text-3xl font-bold">Create your account</h1>
        <p className="mt-1 text-sm text-ink/60">
          One profile. Ranked matches. Zero spam.
        </p>
      </div>
      <GoogleSignInButton label="Sign up with Google" />
      <div className="flex items-center gap-3 text-xs text-ink/40">
        <span className="h-px flex-1 bg-slate/30" />
        or with email
        <span className="h-px flex-1 bg-slate/30" />
      </div>
      <form onSubmit={handleSubmit} className="card flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Full name
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={inputClass}
            placeholder="Ada Lovelace"
          />
        </label>
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
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            placeholder="At least 8 characters"
          />
        </label>
        {error && <p className="text-sm font-medium text-coral">{error}</p>}
        {message && <p className="text-sm font-medium text-teal">{message}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Creating account…" : "Sign up"}
        </button>
      </form>
      <p className="text-center text-sm text-ink/60">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-teal hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
