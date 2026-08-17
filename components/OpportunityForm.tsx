"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OPPORTUNITY_TYPES } from "@/lib/types";

const inputClass =
  "w-full rounded-control border border-slate/40 bg-card px-3 py-2 text-sm text-ink outline-none focus:border-ink";

export default function OpportunityForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const payload = {
      title: String(form.get("title") ?? "").trim(),
      company: String(form.get("company") ?? "").trim(),
      location: String(form.get("location") ?? "").trim(),
      type: String(form.get("type") ?? "internship"),
      deadline: form.get("deadline") ? String(form.get("deadline")) : null,
      skills: String(form.get("skills") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      description: String(form.get("description") ?? "").trim(),
    };

    const res = await fetch("/api/opportunities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data?.warning) {
        setWarning(data.warning);
        setSubmitting(false);
      } else {
        router.push("/opportunities");
        router.refresh();
      }
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Title *
          <input required name="title" className={inputClass} placeholder="Frontend intern" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Company
          <input name="company" className={inputClass} placeholder="Acme Studio" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Location
          <input name="location" className={inputClass} placeholder="Remote / Berlin" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Type
          <select name="type" className={inputClass} defaultValue="internship">
            {OPPORTUNITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Application deadline
          <input type="date" name="deadline" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Skills (comma-separated)
          <input name="skills" className={inputClass} placeholder="React, TypeScript, UX" />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Description *
        <textarea
          required
          name="description"
          rows={6}
          className={inputClass}
          placeholder="What will the intern do, learn, and get?"
        />
      </label>
      {error && <p className="text-sm font-medium text-coral">{error}</p>}
      {warning && <p className="text-sm font-medium text-amber-600">{warning}</p>}
      <div>
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Posting…" : "Post opportunity"}
        </button>
      </div>
    </form>
  );
}
