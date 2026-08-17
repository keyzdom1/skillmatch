import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { getAdminUser } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  try {
    const admin = createAdminClient();

    const [
      { count: profiles },
      { count: totalOpportunities },
      { count: active },
      { count: applications },
    ] = await Promise.all([
        admin.from("profiles").select("id", { count: "exact", head: true }),
        admin.from("opportunities").select("id", { count: "exact", head: true }),
        admin
          .from("opportunities")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true),
        admin.from("applications").select("id", { count: "exact", head: true }),
      ]);

    const [{ data: authUsers }, { data: profilesData }, { data: oppsData }, { data: appsData }] =
      await Promise.all([
        admin.auth.admin.listUsers({ perPage: 1000 }),
        admin
          .from("profiles")
          .select("id, full_name, headline, skills, created_at")
          .order("created_at", { ascending: false })
          .limit(200),
        admin
          .from("opportunities")
          .select(
            "id, title, company, type, is_active, source, created_at, applications(count)"
          )
          .order("created_at", { ascending: false })
          .limit(200),
        admin
          .from("applications")
          .select(
            "id, status, created_at, profiles(full_name, avatar_url), opportunities(id, title, company)"
          )
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

    const emailById = new Map(
      (authUsers?.users ?? []).map((u) => [u.id, u.email ?? ""])
    );

    const users = (profilesData ?? []).map((p) => ({
      id: p.id,
      email: emailById.get(p.id) ?? "",
      full_name: p.full_name,
      headline: p.headline,
      skills: p.skills,
      created_at: p.created_at,
    }));

    const opportunities = (oppsData ?? []).map((o) => ({
      id: o.id,
      title: o.title,
      company: o.company,
      type: o.type,
      is_active: o.is_active,
      source: o.source,
      created_at: o.created_at,
      applications_count:
        (o.applications as { count: number }[] | undefined)?.[0]?.count ?? 0,
    }));

    const apps = (appsData ?? []).map((a) => {
      const profile = a.profiles as unknown as { full_name: string | null } | null;
      const opp = a.opportunities as unknown as {
        title: string;
        company: string | null;
      } | null;
      return {
        id: a.id,
        status: a.status,
        created_at: a.created_at,
        profile_name: profile?.full_name ?? null,
        opportunity_title: opp?.title ?? "Unknown",
        company: opp?.company ?? null,
      };
    });

    return NextResponse.json({
      me: adminUser.id,
      stats: {
        profiles: profiles ?? 0,
        opportunities: totalOpportunities ?? 0,
        active: active ?? 0,
        applications: applications ?? 0,
      },
      users,
      opportunities,
      applications: apps,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load admin data" },
      { status: 500 }
    );
  }
}