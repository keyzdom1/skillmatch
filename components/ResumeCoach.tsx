"use client";

import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase";
import type { Opportunity } from "@/lib/types";

const inputClass =
  "w-full rounded-control border border-slate/40 bg-card px-3 py-2 text-sm text-ink outline-none focus:border-ink";

const REQUEST_TIMEOUT_MS = 150_000;

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
  hasStoredResume = false,
}: {
  opportunities: Opportunity[];
  initialOpportunityId: string | null;
  hasStoredResume?: boolean;
}) {
  const [opportunityId, setOpportunityId] = useState<string>(
    initialOpportunityId && opportunities.some((o) => o.id === initialOpportunityId)
      ? initialOpportunityId
      : ""
  );
  const [resumeText, setResumeText] = useState("");
  const [resumePath, setResumePath] = useState<string | null>(null);
  const [resumeName, setResumeName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [advice, setAdvice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"advice" | "rewrite">("advice");
  const [copied, setCopied] = useState(false);
  const resumeInput = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File | null) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Please upload a PDF resume.");
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const supabase = createBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      setResumePath(path);
      setResumeName(file.name);
      setError(null);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function run(m: "advice" | "rewrite", e?: React.FormEvent) {
    e?.preventDefault();
    setMode(m);
    setLoading(true);
    setError(null);
    setAdvice(null);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          opportunityId: opportunityId || null,
          resumeText: resumeText || null,
          resumePath: resumePath || null,
          mode: m,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "Could not generate advice");
      }
      setAdvice(data.advice ?? "");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError(
          "This took too long — the free AI model may be busy. Please try again."
        );
      } else {
        setError(
          err instanceof Error ? err.message : "Could not generate advice"
        );
      }
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }

  async function copyAdvice() {
    if (!advice) return;
    try {
      await navigator.clipboard.writeText(advice);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — leave the text selectable.
    }
  }

  function downloadAdvice() {
    if (!advice) return;
    const blob = new Blob([advice], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "skillmatch-tailored-resume.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  const resumeHint = resumeName
    ? "(optional — the resume you just uploaded will be used)"
    : hasStoredResume
      ? "(optional — we'll use the resume you uploaded to your profile)"
      : "(optional — your profile is used too)";

  return (
    <form
      onSubmit={(e) => run(mode, e)}
      className="card flex flex-col gap-4"
    >
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
          Paste your resume text <span className="font-normal text-ink/50">{resumeHint}</span>
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

      <div className="flex flex-wrap items-center gap-3 rounded-control border border-slate/30 bg-paper px-3 py-2">
        <span className="text-sm font-medium">Resume file:</span>
        {resumeName ? (
          <>
            <span className="break-all text-sm text-teal">✓ {resumeName} ready</span>
            <button
              type="button"
              onClick={() => resumeInput.current?.click()}
              className="rounded-control border border-ink/20 px-2.5 py-1 text-xs font-medium hover:bg-ink hover:text-paper"
            >
              Replace
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => resumeInput.current?.click()}
            disabled={uploading}
            className="rounded-control border border-ink/20 px-2.5 py-1 text-xs font-medium hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? "Uploading…" : "Upload PDF"}
          </button>
        )}
        {!resumeName && hasStoredResume && (
          <span className="text-xs text-ink/50">
            (the resume on your profile is used too)
          </span>
        )}
        <input
          ref={resumeInput}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => handleUpload(e.target.files?.[0] ?? null)}
        />
      </div>

      {uploadError && <p className="text-sm font-medium text-coral">{uploadError}</p>}
      {error && <p className="text-sm font-medium text-coral">{error}</p>}
      {loading && (
        <p className="text-sm text-ink/60">
          {mode === "rewrite"
            ? "Applying the advice to your resume… (free models can take a moment)"
            : "Asking the AI coach to review your resume… (free models can take a moment)"}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => run("advice")}
          disabled={loading}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading && mode === "advice" ? "Reviewing…" : "Get AI advice"}
        </button>
        <button
          type="button"
          onClick={() => run("rewrite")}
          disabled={loading}
          className="rounded-control border border-teal px-4 py-2 text-sm font-medium text-teal hover:bg-teal hover:text-paper disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading && mode === "rewrite" ? "Rewriting…" : "Rewrite my resume"}
        </button>
        {advice && (
          <Link href="/profile" className="text-sm font-medium text-teal hover:underline">
            Update your profile →
          </Link>
        )}
      </div>

      {advice !== null && (
        <div className="rounded-control border border-slate/30 bg-paper p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-xs font-medium uppercase tracking-widest text-teal">
              {mode === "rewrite" ? "Your tailored resume" : "AI coach feedback"}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copyAdvice}
                className="rounded-control border border-ink/20 px-2.5 py-1 text-xs font-medium hover:bg-ink hover:text-paper"
              >
                {copied ? "Copied!" : "Copy to clipboard"}
              </button>
              {mode === "rewrite" && (
                <button
                  type="button"
                  onClick={downloadAdvice}
                  className="rounded-control border border-ink/20 px-2.5 py-1 text-xs font-medium hover:bg-ink hover:text-paper"
                >
                  Download .txt
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1.5 text-sm text-ink/90">
            {renderAdvice(advice)}
          </div>
        </div>
      )}
    </form>
  );
}