"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ProfileForm from "@/components/ProfileForm";
import ProfileView, { type ProfileData } from "@/components/ProfileView";

function hasFilledProfile(profile: ProfileData | null): boolean {
  if (!profile) return false;
  return Boolean(
    profile.full_name ||
      profile.headline ||
      profile.bio ||
      profile.education ||
      profile.experience ||
      profile.avatar_url ||
      profile.resume_url ||
      (profile.skills?.length ?? 0) > 0
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const loadProfile = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/profile")
      .then((res) => {
        if (!res.ok) throw new Error("Could not load profile");
        return res.json();
      })
      .then((data) => {
        setProfile(data.profile);
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Could not load profile"
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const filled = hasFilledProfile(profile);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Your profile</h1>
          <p className="mt-1 text-sm text-ink/60">
            Saving your profile recalculates your matches.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {filled && !editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="btn-primary"
            >
              Edit profile
            </button>
          )}
          {filled && editing && (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-control border border-ink/20 px-3 py-1.5 text-sm font-medium hover:bg-ink hover:text-paper"
            >
              Cancel
            </button>
          )}
          <Link
            href="/matches"
            className="rounded-control border border-ink/20 px-3 py-1.5 text-sm font-medium hover:bg-ink hover:text-paper"
          >
            See my matches
          </Link>
        </div>
      </div>
      {error && <p className="text-sm font-medium text-coral">{error}</p>}
      {loading ? (
        <p className="text-sm text-ink/60">Loading profile…</p>
      ) : editing ? (
        <ProfileForm
          initial={profile ?? {}}
          onSaved={() => {
            setEditing(false);
            loadProfile();
          }}
        />
      ) : filled ? (
        <ProfileView profile={profile as ProfileData} onEdit={() => setEditing(true)} />
      ) : (
        <ProfileForm initial={profile ?? {}} onSaved={loadProfile} />
      )}
    </div>
  );
}