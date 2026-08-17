import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { logout } from "@/lib/actions";

export default async function Header() {
  const user = await getSessionUser();

  return (
    <header className="border-b border-slate/30 bg-paper">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="font-display text-xl font-bold tracking-tight">
          Skill<span className="text-teal">Match</span>
        </Link>
        <nav className="flex items-center gap-4 sm:gap-6">
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
        </nav>
      </div>
    </header>
  );
}
