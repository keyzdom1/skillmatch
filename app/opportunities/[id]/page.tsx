import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabase } from "@/lib/supabaseServer";
import { getSessionUser } from "@/lib/auth";
import ApplyButton from "@/components/ApplyButton";
import Tag from "@/components/Tag";
import { stripHtml } from "@/lib/sanitize";
import type { Opportunity } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OpportunityDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [supabase, user] = await Promise.all([
    createServerSupabase(),
    getSessionUser(),
  ]);

  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const opportunity = data as Opportunity;
  const closed = opportunity.deadline
    ? new Date(`${opportunity.deadline}T23:59:59`).getTime() < Date.now()
    : false;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link href="/opportunities" className="text-sm font-medium text-teal hover:underline">
        ← All opportunities
      </Link>
      <article className="card flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold">{opportunity.title}</h1>
            <p className="mt-1 text-ink/60">
              {opportunity.company || "Company TBD"}
              {opportunity.location ? ` · ${opportunity.location}` : ""}
            </p>
          </div>
          <Tag tone="info">{opportunity.type}</Tag>
        </div>
        <div className="flex flex-wrap gap-2">
          {opportunity.skills.map((skill) => (
            <Tag key={skill}>{skill}</Tag>
          ))}
        </div>
        <p className="whitespace-pre-line text-ink/80">{stripHtml(opportunity.description)}</p>
        {opportunity.deadline && (
          <p className="font-mono text-sm font-medium">
            Deadline:{" "}
            <span className={closed ? "text-ink/50" : "text-coral"}>
              {new Date(`${opportunity.deadline}T00:00:00`).toLocaleDateString()}
              {closed ? " (closed)" : ""}
            </span>
          </p>
        )}
        <div className="border-t border-slate/30 pt-4">
          {closed ? (
            <p className="text-sm font-medium text-ink/50">
              Applications for this opportunity are closed.
            </p>
          ) : user ? (
            <div className="flex flex-wrap items-center gap-3">
              <ApplyButton opportunityId={opportunity.id} />
              <Link
                href={`/resume-coach?opportunityId=${opportunity.id}`}
                className="rounded-control border border-ink/20 px-4 py-2.5 text-sm font-medium hover:bg-ink hover:text-paper"
              >
                AI resume coach
              </Link>
            </div>
          ) : (
            <Link
              href={`/login?next=/opportunities/${opportunity.id}`}
              className="btn-primary"
            >
              Log in to apply
            </Link>
          )}
        </div>
      </article>
    </div>
  );
}