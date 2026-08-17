import Link from "next/link";
import { createServerSupabase } from "@/lib/supabaseServer";
import { getSessionUser } from "@/lib/auth";
import OpportunityCard from "@/components/OpportunityCard";
import type { Opportunity, OpportunityWithMatch } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OpportunitiesPage() {
  const [supabase, user] = await Promise.all([
    createServerSupabase(),
    getSessionUser(),
  ]);

  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

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

      {opportunities.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-16 text-center">
          <p className="font-display text-xl font-semibold">No opportunities yet</p>
          <p className="max-w-sm text-sm text-ink/60">
            {user
              ? "Be the first to post one — it only takes a minute."
              : "Create an account to post the first opportunity."}
          </p>
          {user ? (
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
