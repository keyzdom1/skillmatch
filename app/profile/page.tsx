"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProfileForm from "@/components/ProfileForm";

type ProfileData = {
  full_name: string | null;
  headline: string | null;
  bio: string | null;
  skills: string[];
  education: string | null;
  experience: string | null;
  resume_url: string | null;
  avatar_url: string | null;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile")
      .then((res) => {
        if (!res.ok) throw new Error("Could not load profile");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setProfile(data.profile);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load profile");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Your profile</h1>
          <p className="mt-1 text-sm text-ink/60">
            Saving your profile recalculates your matches.
          </p>
        </div>
        <Link href="/matches" className="rounded-control border border-ink/20 px-3 py-1.5 text-sm font-medium hover:bg-ink hover:text-paper">
          See my matches
        </Link>
      </div>
      {error && <p className="text-sm font-medium text-coral">{error}</p>}
      {loading ? (
        <p className="text-sm text-ink/60">Loading profile…</p>
      ) : (
        <ProfileForm initial={profile ?? {}} />
      )}
    </div>
  );
}