"use client";

import { useState } from "react";

export default function ApplyButton({ opportunityId }: { opportunityId: string }) {
  const [state, setState] = useState<"idle" | "applying" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleApply() {
    setState("applying");
    setError(null);
    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ opportunityId }),
    });
    if (res.ok) {
      setState("done");
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Could not submit application");
      setState("error");
    }
  }

  if (state === "done") {
    return <p className="text-sm font-medium text-teal">Application submitted</p>;
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        onClick={handleApply}
        disabled={state === "applying"}
        className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {state === "applying" ? "Applying…" : "Apply now"}
      </button>
      {error && <p className="text-sm font-medium text-coral">{error}</p>}
    </div>
  );
}
