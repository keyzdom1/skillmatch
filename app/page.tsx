import Link from "next/link";
import MatchStamp from "@/components/MatchStamp";

export default function Home() {
  return (
    <div className="flex flex-col gap-16 py-10">
      <section className="flex flex-col items-start gap-8">
        <div className="flex flex-col gap-4">
          <p className="font-mono text-sm font-medium uppercase tracking-widest text-teal">
            AI-powered internship matching
          </p>
          <h1 className="max-w-2xl font-display text-4xl font-bold leading-tight sm:text-5xl">
            Find the internship that{" "}
            <span className="relative inline-block">
              <span className="relative z-10">actually</span>
              <span className="absolute inset-x-0 bottom-1 -z-0 h-3 bg-highlighter/70" />
            </span>{" "}
            fits you.
          </h1>
          <p className="max-w-xl text-lg text-ink/70">
            Build your profile once, get ranked matches against real
            opportunities — no more scrolling through listings that don&apos;t
            fit.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/signup" className="btn-primary">
            Build my profile
          </Link>
          <Link
            href="/resume-coach"
            className="rounded-control bg-highlighter px-4 py-2.5 text-sm font-semibold text-ink hover:brightness-95"
          >
            AI resume builder
          </Link>
          <Link
            href="/opportunities"
            className="rounded-control border border-ink/20 px-4 py-2.5 text-sm font-medium hover:bg-ink hover:text-paper"
          >
            Browse opportunities
          </Link>
        </div>
        <div className="flex items-center gap-3 rounded-control border border-slate/30 bg-card px-4 py-3">
          <MatchStamp percent={0.92} />
          <div className="text-sm text-ink/70">
            <span className="font-mono font-medium text-ink">92% match</span> — your
            skills, compared against the posting. Recalculated as you update your
            profile.
          </div>
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-3">
        {[
          {
            step: "01",
            title: "Build your profile",
            body: "Skills, studies, and what you're hoping to learn. Two minutes.",
          },
          {
            step: "02",
            title: "Get stamped matches",
            body: "AI similarity search ranks every open opportunity against you.",
          },
          {
            step: "03",
            title: "Apply with confidence",
            body: "Resume attached, employer notified, you're in the running.",
          },
        ].map((item) => (
          <div key={item.step} className="card flex flex-col gap-2">
            <span className="font-mono text-sm font-medium text-teal">{item.step}</span>
            <h2 className="font-display text-lg font-semibold">{item.title}</h2>
            <p className="text-sm text-ink/70">{item.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
