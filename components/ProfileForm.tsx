"use client";

import { useEffect, useRef, useState } from "react";
import { createBrowserClient } from "@/lib/supabase";

const inputClass =
  "w-full rounded-control border border-slate/40 bg-card px-3 py-2 text-sm text-ink outline-none focus:border-ink";

type FormState = {
  fullName: string;
  headline: string;
  bio: string;
  skills: string;
  education: string;
  experience: string;
  avatarUrl: string | null;
  resumePath: string | null;
  resumeSignedUrl: string | null;
};

type InitialState = Partial<
  Record<
    "fullName" | "headline" | "bio" | "education" | "experience" | "resumeUrl" | "avatarUrl",
    string | null
  >
> & { skills?: string[] | null };

export default function ProfileForm({ initial }: { initial: InitialState }) {
  const resumeStored = initial.resumeUrl ?? null;
  const resumeIsLegacy = resumeStored ? resumeStored.startsWith("http") : false;

  const [form, setForm] = useState<FormState>({
    fullName: initial.fullName ?? "",
    headline: initial.headline ?? "",
    bio: initial.bio ?? "",
    skills: Array.isArray(initial.skills) ? initial.skills.join(", ") : "",
    education: initial.education ?? "",
    experience: initial.experience ?? "",
    avatarUrl: initial.avatarUrl ?? null,
    resumePath: resumeStored,
    resumeSignedUrl: resumeIsLegacy ? resumeStored : null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const resumeInput = useRef<HTMLInputElement>(null);
  const avatarInput = useRef<HTMLInputElement>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    const path = form.resumePath;
    if (!path || path.startsWith("http") || form.resumeSignedUrl) return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = createBrowserClient();
        const { data, error } = await supabase.storage
          .from("resumes")
          .createSignedUrl(path, 3600);
        if (!cancelled && !error && data?.signedUrl) {
          set("resumeSignedUrl", data.signedUrl);
        }
      } catch {
        // Leave resume link hidden; user can re-upload.
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.resumePath]);

  async function handleUpload(
    file: File | null,
    bucket: "resumes" | "avatars",
    kind: "avatar" | "resume"
  ) {
    if (!file) return;
    setUploading(true);
    setError(null);
    setUploaded(null);
    try {
      const supabase = createBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      if (kind === "avatar") {
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
        set("avatarUrl", urlData.publicUrl);
        setUploaded("Avatar uploaded");
      } else {
        const { data: urlData, error: signError } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, 3600);
        if (signError) throw signError;
        set("resumePath", path);
        set("resumeSignedUrl", urlData?.signedUrl ?? null);
        setUploaded("Resume uploaded");
      }
      setSaved(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setWarning(null);
    setUploaded(null);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.fullName.trim() || null,
          headline: form.headline.trim() || null,
          bio: form.bio.trim() || null,
          skills: form.skills
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          education: form.education.trim() || null,
          experience: form.experience.trim() || null,
          resume_url: form.resumePath,
          avatar_url: form.avatarUrl,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "Could not save profile");
      }
      if (data?.warning) setWarning(data.warning);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-4">
      <div className="flex items-center gap-4">
        {form.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={form.avatarUrl}
            alt="Avatar"
            className="h-16 w-16 rounded-full border border-slate/40 object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-slate/40 bg-paper font-display text-xl font-bold text-ink/40">
            ?
          </div>
        )}
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => avatarInput.current?.click()}
            className="text-sm font-medium text-teal hover:underline"
          >
            {uploading ? "Uploading…" : "Upload avatar"}
          </button>
          <input
            ref={avatarInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleUpload(e.target.files?.[0] ?? null, "avatars", "avatar")}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Full name *
          <input
            required
            value={form.fullName}
            onChange={(e) => set("fullName", e.target.value)}
            className={inputClass}
            placeholder="Ada Lovelace"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Headline
          <input
            value={form.headline}
            onChange={(e) => set("headline", e.target.value)}
            className={inputClass}
            placeholder="Aspiring frontend developer"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
          Bio
          <textarea
            value={form.bio}
            onChange={(e) => set("bio", e.target.value)}
            rows={3}
            className={inputClass}
            placeholder="What are you studying, building, or curious about?"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Skills (comma-separated)
          <input
            value={form.skills}
            onChange={(e) => set("skills", e.target.value)}
            className={inputClass}
            placeholder="JavaScript, Figma, Communication"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Education
          <input
            value={form.education}
            onChange={(e) => set("education", e.target.value)}
            className={inputClass}
            placeholder="BSc Computer Science, 3rd year"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
          Experience
          <textarea
            value={form.experience}
            onChange={(e) => set("experience", e.target.value)}
            rows={3}
            className={inputClass}
            placeholder="Prior roles, projects, volunteer work…"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <span className="text-sm font-medium">Resume:</span>
        {form.resumeSignedUrl ? (
          <a
            href={form.resumeSignedUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-teal hover:underline"
          >
            View current resume
          </a>
        ) : (
          <span className="text-sm text-ink/50">
            {form.resumePath ? "Resume stored (link expired — re-save to refresh)" : "None uploaded"}
          </span>
        )}
        <button
          type="button"
          onClick={() => resumeInput.current?.click()}
          className="rounded-control border border-ink/20 px-3 py-1.5 text-sm font-medium hover:bg-ink hover:text-paper"
        >
          {uploading ? "Uploading…" : "Upload resume"}
        </button>
        <input
          ref={resumeInput}
          type="file"
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={(e) => handleUpload(e.target.files?.[0] ?? null, "resumes", "resume")}
        />
      </div>

      {uploaded && <p className="text-sm font-medium text-teal">{uploaded}</p>}
      {error && <p className="text-sm font-medium text-coral">{error}</p>}
      {warning && <p className="text-sm font-medium text-amber-600">{warning}</p>}
      {saved && !warning && (
        <p className="text-sm font-medium text-teal">Profile saved</p>
      )}
      <div>
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Save profile"}
        </button>
      </div>
    </form>
  );
}