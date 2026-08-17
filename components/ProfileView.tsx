"use client";

import { useEffect, useState } from "react";
import Tag from "./Tag";
import { createBrowserClient } from "@/lib/supabase";

export type ProfileData = {
  full_name: string | null;
  headline: string | null;
  bio: string | null;
  skills: string[];
  education: string | null;
  experience: string | null;
  resume_url: string | null;
  avatar_url: string | null;
};

function initialsOf(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function Section({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="font-mono text-xs font-medium text-ink/50">{label}</p>
      <p className="mt-1 whitespace-pre-line text-sm text-ink/80">{text}</p>
    </div>
  );
}

export default function ProfileView({
  profile,
  onEdit,
}: {
  profile: ProfileData;
  onEdit: () => void;
}) {
  const [resumeUrl, setResumeUrl] = useState<string | null>(
    profile.resume_url && profile.resume_url.startsWith("http")
      ? profile.resume_url
      : null
  );

  useEffect(() => {
    const path = profile.resume_url;
    if (!path || path.startsWith("http")) return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = createBrowserClient();
        const { data, error } = await supabase.storage
          .from("resumes")
          .createSignedUrl(path, 3600);
        if (!cancelled && !error && data?.signedUrl) {
          setResumeUrl(data.signedUrl);
        }
      } catch {
        // Leave resume link hidden; user can view it in edit mode.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile.resume_url]);

  return (
    <div className="card flex flex-col gap-5">
      <div className="flex items-center gap-4">
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt={profile.full_name ?? "Avatar"}
            className="h-16 w-16 rounded-full border border-slate/40 object-cover"
          />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-slate/40 bg-ink font-display text-xl font-bold text-paper">
            {initialsOf(profile.full_name)}
          </span>
        )}
        <div>
          <h2 className="font-display text-2xl font-bold">
            {profile.full_name ?? "Your name"}
          </h2>
          {profile.headline && (
            <p className="text-sm text-ink/60">{profile.headline}</p>
          )}
        </div>
      </div>

      {profile.bio && <p className="text-sm text-ink/80">{profile.bio}</p>}

      {profile.skills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {profile.skills.map((skill) => (
            <Tag key={skill} tone="success">
              {skill}
            </Tag>
          ))}
        </div>
      )}

      {profile.education && (
        <Section label="Education" text={profile.education} />
      )}
      {profile.experience && (
        <Section label="Experience" text={profile.experience} />
      )}

      {resumeUrl && (
        <a
          href={resumeUrl}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-medium text-teal hover:underline"
        >
          View resume
        </a>
      )}

      <div>
        <button type="button" onClick={onEdit} className="btn-primary">
          Edit profile
        </button>
      </div>
    </div>
  );
}