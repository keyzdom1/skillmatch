"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { logout } from "@/lib/actions";

export default function MobileNav({
  signedIn,
  isAdmin,
  name,
  avatarUrl,
}: {
  signedIn: boolean;
  isAdmin: boolean;
  name: string | null;
  avatarUrl: string | null;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const linkClass =
    "rounded-control px-3 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-paper";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="rounded-control border border-ink/20 p-1.5 text-ink transition-colors hover:bg-ink hover:text-paper"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="h-5 w-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
          />
        </svg>
      </button>

      <div
        className={`fixed inset-0 z-40 bg-ink/40 transition-opacity duration-200 md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-72 max-w-[85vw] flex-col gap-1 border-l border-slate/20 bg-card p-4 shadow-xl transition-transform duration-200 ease-out md:hidden ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        aria-label="Mobile menu"
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={name ?? "Your avatar"}
                className="h-10 w-10 shrink-0 rounded-full border border-slate/40 object-cover"
              />
            ) : (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate/40 bg-ink text-sm font-bold text-paper">
                {name
                  ? name
                      .trim()
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((p) => p[0]?.toUpperCase() ?? "")
                      .join("")
                  : "?"}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">
                {signedIn ? (name ?? "Your account") : "SkillMatch"}
              </p>
              <p className="truncate text-xs text-ink/50">
                {signedIn ? "Signed in" : "Guest"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="rounded-control border border-ink/20 p-1.5 text-ink transition-colors hover:bg-ink hover:text-paper"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="my-2 h-px bg-slate/20" />

        <Link href="/opportunities" onClick={() => setOpen(false)} className={linkClass}>
          Opportunities
        </Link>
        {signedIn && (
          <>
            <Link href="/matches" onClick={() => setOpen(false)} className={linkClass}>
              My matches
            </Link>
            <Link href="/profile" onClick={() => setOpen(false)} className={linkClass}>
              Profile
            </Link>
          </>
        )}
        {signedIn && isAdmin && (
          <Link href="/admin" onClick={() => setOpen(false)} className={linkClass}>
            Admin
          </Link>
        )}

        <div className="mt-auto flex flex-col gap-2 pt-4">
          {signedIn ? (
            <form action={logout}>
              <button
                type="submit"
                className="w-full rounded-control border border-ink/20 px-3 py-2.5 text-sm font-medium text-ink hover:bg-ink hover:text-paper"
              >
                Sign out
              </button>
            </form>
          ) : (
            <>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-control border border-ink/20 px-3 py-2.5 text-center text-sm font-medium text-ink hover:bg-ink hover:text-paper"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="rounded-control bg-ink px-3 py-2.5 text-center text-sm font-medium text-paper hover:opacity-90"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </aside>
    </>
  );
}