import { createServerSupabase } from "@/lib/supabaseServer";
import ResumeCoach from "@/components/ResumeCoach";
import type { Opportunity } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ResumeCoachPage({
  searchParams,
}: {
  searchParams: { opportunityId?: string };
}) {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  const opportunities = (data ?? []) as Opportunity[];
  const initialOpportunityId = searchParams.opportunityId ?? null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-bold">AI resume coach</h1>
        <p className="mt-1 text-sm text-ink/60">
          Pick the job or internship you want, and get concrete advice on how to
          tailor your resume and profile to it.
        </p>
      </div>
      {error ? (
        <p className="text-sm font-medium text-coral">Could not load opportunities.</p>
      ) : (
        <ResumeCoach
          opportunities={opportunities}
          initialOpportunityId={initialOpportunityId}
        />
      )}
      <p className="text-xs text-ink/50">
        Powered by a free Hugging Face model. Your profile and pasted resume are
        used only for this request.
      </p>
    </div>
  );
}