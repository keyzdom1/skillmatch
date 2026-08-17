"use client";

import { useCallback, useEffect, useState } from "react";
import Tag from "./Tag";

type OverviewData = {
  stats: {
    profiles: number;
    opportunities: number;
    active: number;
    applications: number;
  };
  users: {
    id: string;
    email: string;
    full_name: string | null;
    headline: string | null;
    skills: string[];
    created_at: string;
  }[];
  opportunities: {
    id: string;
    title: string;
    company: string | null;
    type: string;
    is_active: boolean;
    source: string | null;
    created_at: string;
    applications_count: number;
  }[];
  applications: {
    id: string;
    status: string;
    created_at: string;
    profile_name: string | null;
    opportunity_title: string;
    company: string | null;
  }[];
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StatsCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="card flex flex-col gap-1">
      <span className="font-mono text-xs font-medium uppercase tracking-widest text-teal">
        {label}
      </span>
      <span className="font-display text-3xl font-bold">{value}</span>
    </div>
  );
}

const tableWrap = "overflow-x-auto rounded-control border border-slate/20";

function Table({
  head,
  children,
}: {
  head: string[];
  children: React.ReactNode;
}) {
  return (
    <div className={tableWrap}>
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate/20 bg-paper">
          <tr>
            {head.map((h) => (
              <th
                key={h}
                className="px-4 py-2.5 font-mono text-xs font-medium uppercase tracking-widest text-ink/50"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate/10">{children}</tbody>
      </table>
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/admin/overview")
      .then((res) => {
        if (!res.ok) throw new Error("Could not load admin data");
        return res.json();
      })
      .then(setData)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load admin data");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(id: string, isActive: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/opportunities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_active: !isActive }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Could not update opportunity");
      }
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update opportunity");
    } finally {
      setBusy(false);
    }
  }

  async function removeOpportunity(id: string, title: string) {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/opportunities?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Could not delete opportunity");
      }
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete opportunity");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-ink/60">Loading admin dashboard…</p>;
  }

  if (error) {
    return <p className="text-sm font-medium text-coral">{error}</p>;
  }

  if (!data) return null;

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Profiles" value={data.stats.profiles} />
        <StatsCard label="Opportunities" value={data.stats.opportunities} />
        <StatsCard label="Active jobs" value={data.stats.active} />
        <StatsCard label="Applications" value={data.stats.applications} />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-bold">Users</h2>
        <Table head={["Name", "Email", "Headline", "Skills", "Joined"]}>
          {data.users.map((u) => (
            <tr key={u.id}>
              <td className="px-4 py-2.5 font-medium">{u.full_name ?? "—"}</td>
              <td className="px-4 py-2.5 text-ink/70">{u.email || "—"}</td>
              <td className="max-w-[16rem] truncate px-4 py-2.5 text-ink/70">
                {u.headline ?? "—"}
              </td>
              <td className="px-4 py-2.5 text-ink/70">
                {u.skills.length > 0 ? u.skills.join(", ") : "—"}
              </td>
              <td className="px-4 py-2.5 text-ink/70">{formatDate(u.created_at)}</td>
            </tr>
          ))}
          {data.users.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-4 text-ink/50">
                No profiles yet.
              </td>
            </tr>
          )}
        </Table>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-bold">Opportunities</h2>
        <Table
          head={["Title", "Company", "Type", "Source", "Applications", "Status", "Actions"]}
        >
          {data.opportunities.map((o) => (
            <tr key={o.id}>
              <td className="max-w-[16rem] truncate px-4 py-2.5 font-medium">{o.title}</td>
              <td className="px-4 py-2.5 text-ink/70">{o.company ?? "—"}</td>
              <td className="px-4 py-2.5 text-ink/70">{o.type}</td>
              <td className="px-4 py-2.5 text-ink/70">{o.source ?? "manual"}</td>
              <td className="px-4 py-2.5 text-ink/70">{o.applications_count}</td>
              <td className="px-4 py-2.5">
                <Tag tone={o.is_active ? "success" : "neutral"}>
                  {o.is_active ? "Active" : "Inactive"}
                </Tag>
              </td>
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => toggleActive(o.id, o.is_active)}
                    className="rounded-control border border-ink/20 px-2.5 py-1 text-xs font-medium hover:bg-ink hover:text-paper disabled:opacity-50"
                  >
                    {o.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => removeOpportunity(o.id, o.title)}
                    className="rounded-control border border-coral/40 px-2.5 py-1 text-xs font-medium text-coral hover:bg-coral hover:text-paper disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {data.opportunities.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-4 text-ink/50">
                No opportunities yet.
              </td>
            </tr>
          )}
        </Table>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-bold">Applications</h2>
        <Table head={["Candidate", "Opportunity", "Company", "Status", "Date"]}>
          {data.applications.map((a) => (
            <tr key={a.id}>
              <td className="px-4 py-2.5 font-medium">{a.profile_name ?? "—"}</td>
              <td className="max-w-[16rem] truncate px-4 py-2.5 text-ink/70">
                {a.opportunity_title}
              </td>
              <td className="px-4 py-2.5 text-ink/70">{a.company ?? "—"}</td>
              <td className="px-4 py-2.5">
                <Tag tone={a.status === "submitted" ? "info" : "neutral"}>
                  {a.status}
                </Tag>
              </td>
              <td className="px-4 py-2.5 text-ink/70">{formatDate(a.created_at)}</td>
            </tr>
          ))}
          {data.applications.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-4 text-ink/50">
                No applications yet.
              </td>
            </tr>
          )}
        </Table>
      </section>
    </div>
  );
}