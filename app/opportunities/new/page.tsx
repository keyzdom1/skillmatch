import OpportunityForm from "@/components/OpportunityForm";

export default function NewOpportunityPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Post an opportunity</h1>
        <p className="mt-1 text-sm text-ink/60">
          Candidates will be matched against this posting with AI similarity
          search.
        </p>
      </div>
      <OpportunityForm />
    </div>
  );
}