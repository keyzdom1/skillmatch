import Link from "next/link";
import { getSessionProfile } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { logout } from "@/lib/actions";
import ThemeToggle from "./ThemeToggle";
import MobileNav from "./MobileNav";

function initialsOf(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function Header() {
  const { user, profile } = await getSessionProfile();

  const name =
    profile?.full_name ??
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name ??
    (user?.email ? user.email.split("@")[0] : null);

  const isAdmin = isAdminEmail(user?.email);

  return (
    <header className="border-b border-slate/30 bg-paper">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="font-display text-xl font-bold tracking-tight">
          Skill<span className="text-teal">Match</span>
        </Link>
        <nav className="hidden items-center gap-3 sm:gap-5 md:flex">
          <Link
            href="/opportunities"
            className="text-sm font-medium text-ink/70 hover:text-ink"
          >
            Opportunities
          </Link>
          {user ? (
            <>
              <Link
                href="/matches"
                className="text-sm font-medium text-ink/70 hover:text-ink"
              >
                My matches
              </Link>
              <Link
                href="/profile"
                className="text-sm font-medium text-ink/70 hover:text-ink"
              >
                Profile
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="text-sm font-medium text-teal hover:underline"
                >
                  Admin
                </Link>
              )}
              <div className="flex items-center gap-2">
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt={name ?? "Your avatar"}
                    className="h-8 w-8 rounded-full border border-slate/40 object-cover"
                  />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate/40 bg-ink text-xs font-bold text-paper">
                    {initialsOf(name)}
                  </span>
                )}
                {name && (
                  <span className="hidden max-w-[10rem] truncate text-sm font-medium text-ink lg:inline">
                    {name}
                  </span>
                )}
              </div>
              <form action={logout}>
                <button
                  type="submit"
                  className="rounded-control border border-ink/20 px-3 py-1.5 text-sm font-medium text-ink hover:bg-ink hover:text-paper"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-ink/70 hover:text-ink"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-control bg-ink px-3 py-1.5 text-sm font-medium text-paper hover:opacity-90"
              >
                Sign up
              </Link>
            </>
          )}
          <ThemeToggle />
        </nav>
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <MobileNav
            signedIn={Boolean(user)}
            isAdmin={isAdmin}
            name={name}
            avatarUrl={profile?.avatar_url ?? null}
          />
        </div>
      </div>
    </header>
  );
}