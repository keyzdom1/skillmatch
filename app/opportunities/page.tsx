import Link from "next/link";
import { createServerSupabase } from "@/lib/supabaseServer";
import { getSessionUser } from "@/lib/auth";
import OpportunityCard from "@/components/OpportunityCard";
import type { Opportunity, OpportunityWithMatch } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = (searchParams.q ?? "").trim();
  const [supabase, user] = await Promise.all([
    createServerSupabase(),
    getSessionUser(),
  ]);

  let query = supabase
    .from("opportunities")
    .select("*")
    .eq("is_active", true);

  if (q) {
    const pattern = `%${q.replace(/[%_]/g, " ")}%`;
    query = query.or(
      `title.ilike.${pattern},company.ilike.${pattern},location.ilike.${pattern},description.ilike.${pattern}`
    );
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  const opportunities = (data ?? []) as Opportunity[];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Opportunities</h1>
          <p className="mt-1 text-sm text-ink/60">
            {error
              ? "Could not load opportunities."
              : `${opportunities.length} open position${opportunities.length === 1 ? "" : "s"} for young people`}
          </p>
        </div>
        {user && (
          <Link href="/opportunities/new" className="btn-primary">
            Post an opportunity
          </Link>
        )}
      </div>

      <form
        method="GET"
        action="/opportunities"
        className="flex w-full max-w-xl gap-2"
        role="search"
      >
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by title, company, location…"
          className="w-full rounded-control border border-slate/40 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-ink"
        />
        <button type="submit" className="btn-primary">
          Search
        </button>
        {q && (
          <Link
            href="/opportunities"
            className="rounded-control border border-ink/20 px-3 py-2.5 text-sm font-medium hover:bg-ink hover:text-paper"
          >
            Clear
          </Link>
        )}
      </form>

      {opportunities.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-16 text-center">
          <p className="font-display text-xl font-semibold">
            {q ? `No results for “${q}”` : "No opportunities yet"}
          </p>
          <p className="max-w-sm text-sm text-ink/60">
            {q
              ? "Try a different search term — title, company, or location."
              : user
                ? "Be the first to post one — it only takes a minute."
                : "Create an account to post the first opportunity."}
          </p>
          {q ? (
            <Link href="/opportunities" className="btn-primary">
              Clear search
            </Link>
          ) : user ? (
            <Link href="/opportunities/new" className="btn-primary">
              Post an opportunity
            </Link>
          ) : (
            <Link href="/signup" className="btn-primary">
              Create an account
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {opportunities.map((opportunity) => (
            <OpportunityCard key={opportunity.id} opportunity={opportunity as OpportunityWithMatch} />
          ))}
        </div>
      )}
    </div>
  );
}
