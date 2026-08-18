import Link from "next/link";
import MatchStamp from "./MatchStamp";
import Tag from "./Tag";
import { stripHtml } from "@/lib/sanitize";

function formatDeadline(deadline: string | null) {
  if (!deadline) return null;
  const date = new Date(`${deadline}T23:59:59`);
  const days = Math.ceil((date.getTime() - Date.now()) / 86_400_000);
  if (days < 0) return `Closed ${date.toLocaleDateString()}`;
  if (days === 0) return "Closes today";
  if (days === 1) return "Closes tomorrow";
  return `Closes in ${days} days`;
}

type CardOpportunity = {
  id: string;
  title: string;
  description: string;
  company: string | null;
  location: string | null;
  type: string;
  deadline: string | null;
  skills: string[];
};

export default function OpportunityCard({
  opportunity,
  matchPercent,
  matchReasons,
}: {
  opportunity: CardOpportunity;
  matchPercent?: number;
  matchReasons?: string[];
}) {
  const deadline = formatDeadline(opportunity.deadline);
  const closed = opportunity.deadline
    ? new Date(`${opportunity.deadline}T23:59:59`).getTime() < Date.now()
    : false;

  return (
    <Link
      href={`/opportunities/${opportunity.id}`}
      className="card relative flex min-w-0 flex-col gap-3 overflow-hidden transition-shadow hover:border-ink/40 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="break-words font-display text-lg font-semibold leading-snug hover:text-teal">
            {opportunity.title}
          </h3>
          <p className="mt-0.5 break-words text-sm text-ink/60">
            {opportunity.company || "Company TBD"}
            {opportunity.location ? ` · ${opportunity.location}` : ""}
          </p>
        </div>
        {matchPercent !== undefined && <MatchStamp percent={matchPercent} />}
      </div>
      {matchReasons && matchReasons.length > 0 && (
        <ul className="flex flex-wrap items-center gap-1.5">
          {matchReasons.map((reason) => (
            <li
              key={reason}
              className="text-xs font-medium text-teal"
            >
              ✓ {reason}
            </li>
          ))}
        </ul>
      )}
      <p className="line-clamp-3 break-words text-sm text-ink/70">
        {stripHtml(opportunity.description)}
      </p>
      <div className="mt-auto flex flex-wrap items-center gap-2">
        <Tag tone="info">{opportunity.type}</Tag>
        {opportunity.skills.slice(0, 3).map((skill) => (
          <Tag key={skill}>{skill}</Tag>
        ))}
        {deadline && (
          <span className="ml-auto">
            <Tag tone={closed ? "neutral" : "urgent"}>{deadline}</Tag>
          </span>
        )}
        <span className="ml-auto font-mono text-xs font-medium text-teal">
          View &amp; apply →
        </span>
      </div>
    </Link>
  );
}
