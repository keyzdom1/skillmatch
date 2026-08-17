"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import type { Opportunity } from "@/lib/types";

const inputClass =
  "w-full rounded-control border border-slate/40 bg-card px-3 py-2 text-sm text-ink outline-none focus:border-ink";

function renderInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    const bold = part.match(/^\*\*(.+?)\*\*$/);
    if (bold) {
      return (
        <strong key={i} className="font-semibold">
          {bold[1]}
        </strong>
      );
    }
    const italic = part.match(/^\*(.+?)\*$/);
    if (italic) {
      return <em key={i}>{italic[1]}</em>;
    }
    return part;
  });
}

function renderAdvice(text: string): ReactNode[] {
  return text.split("\n").map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return <div key={i} className="h-3" />;
    }

    const header = trimmed.match(/^#{1,3}\s+(.*)$/);
    if (header) {
      return (
        <p key={i} className="font-display text-base font-bold text-ink">
          {renderInline(header[1])}
        </p>
      );
    }

    const boldHeader = trimmed.match(/^\*\*(.+?)\*\*$/);
    if (boldHeader) {
      return (
        <p key={i} className="font-display text-base font-bold text-ink">
          {renderInline(boldHeader[1])}
        </p>
      );
    }

    if (/^[-*•]\s+/.test(trimmed)) {
      return (
        <p key={i} className="flex gap-2">
          <span className="text-teal">•</span>
          <span>{renderInline(trimmed.replace(/^[-*•]\s+/, ""))}</span>
        </p>
      );
    }

    return <p key={i}>{renderInline(trimmed)}</p>;
  });
}

export default function ResumeCoach({
  opportunities,
  initialOpportunityId,
}: {
  opportunities: Opportunity[];
  initialOpportunityId: string | null;
}) {
  const [opportunityId, setOpportunityId] = useState<string>(
    initialOpportunityId && opportunities.some((o) => o.id === initialOpportunityId)
      ? initialOpportunityId
      : ""
  );
  const [resumeText, setResumeText] = useState("");
  const [advice, setAdvice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setAdvice(null);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunityId: opportunityId || null,
          resumeText: resumeText || null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "Could not generate advice");
      }
      setAdvice(data.advice ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate advice");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="coach-opportunity" className="text-sm font-medium">
          Target opportunity
        </label>
        <select
          id="coach-opportunity"
          value={opportunityId}
          onChange={(e) => setOpportunityId(e.target.value)}
          className={inputClass}
        >
          <option value="">No specific role — general advice</option>
          {opportunities.map((o) => (
            <option key={o.id} value={o.id}>
              {o.title}
              {o.company ? ` — ${o.company}` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="coach-resume" className="text-sm font-medium">
          Paste your resume text{" "}
          <span className="font-normal text-ink/50">(optional — your profile is used too)</span>
        </label>
        <textarea
          id="coach-resume"
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          rows={8}
          className={inputClass}
          placeholder="Paste your resume here for the most tailored advice…"
        />
      </div>

      {error && <p className="text-sm font-medium text-coral">{error}</p>}
      {loading && (
        <p className="text-sm text-ink/60">
          Asking the AI coach to review your resume… (free models can take a moment)
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Reviewing…" : "Get AI advice"}
        </button>
        {advice && (
          <Link href="/profile" className="text-sm font-medium text-teal hover:underline">
            Update your profile →
          </Link>
        )}
      </div>

      {advice !== null && (
        <div className="rounded-control border border-slate/30 bg-paper p-4">
          <p className="mb-2 font-mono text-xs font-medium uppercase tracking-widest text-teal">
            AI coach feedback
          </p>
          <div className="flex flex-col gap-1.5 text-sm text-ink/90">
            {renderAdvice(advice)}
          </div>
        </div>
      )}
    </form>
  );
}
