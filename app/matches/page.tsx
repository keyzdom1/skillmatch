"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import OpportunityCard from "@/components/OpportunityCard";
import type { MatchResult } from "@/lib/types";

export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/matches", { method: "POST" })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (!ok) throw new Error(data?.error ?? "Matching failed");
        setMatches(data.matches ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Matching failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Your matches</h1>
        <p className="mt-1 text-sm text-ink/60">
          Ranked by similarity against your profile — the stamp is your match score.
        </p>
      </div>

      {loading && <p className="text-sm text-ink/60">Comparing your profile…</p>}

      {error && (
        <div className="card flex flex-col items-start gap-3 py-10">
          <p className="text-sm font-medium text-coral">{error}</p>
          <Link href="/profile" className="btn-primary">
            Complete my profile
          </Link>
        </div>
      )}

      {!loading && !error && matches.length === 0 && (
        <div className="card flex flex-col items-center gap-3 py-16 text-center">
          <p className="font-display text-xl font-semibold">No matches yet</p>
          <p className="max-w-sm text-sm text-ink/60">
            Add more skills and experience to your profile to improve your
            matches — or check back when new opportunities are posted.
          </p>
          <div className="flex gap-3">
            <Link href="/profile" className="btn-primary">
              Improve my profile
            </Link>
            <Link
              href="/opportunities"
              className="rounded-control border border-ink/20 px-4 py-2.5 text-sm font-medium hover:bg-ink hover:text-paper"
            >
              Browse all
            </Link>
          </div>
        </div>
      )}

      {!loading && !error && matches.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2">
          {matches.map((match) => (
            <OpportunityCard
              key={match.id}
              opportunity={match}
              matchPercent={match.similarity}
            />
          ))}
        </div>
      )}
    </div>
  );
}