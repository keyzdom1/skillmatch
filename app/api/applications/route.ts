import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { createAdminClient } from "@/lib/supabase";
import { sendApplicationNotification } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const opportunityId = body?.opportunityId;
  if (typeof opportunityId !== "string" || !opportunityId) {
    return NextResponse.json({ error: "Missing opportunityId" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, full_name")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError || !profile) {
      return NextResponse.json(
        { error: profileError?.message ?? "Complete your profile before applying" },
        { status: profileError ? 500 : 400 }
      );
    }

    const { data: opportunity, error: oppError } = await admin
      .from("opportunities")
      .select("id, title, company, employer_id, is_active, source")
      .eq("id", opportunityId)
      .maybeSingle();
    if (oppError || !opportunity) {
      return NextResponse.json(
        { error: oppError?.message ?? "Opportunity not found" },
        { status: oppError ? 500 : 404 }
      );
    }
    if (!opportunity.is_active) {
      return NextResponse.json({ error: "This opportunity is closed" }, { status: 400 });
    }

    const { error: insertError } = await admin.from("applications").insert({
      profile_id: profile.id,
      opportunity_id: opportunityId,
    });
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    if (opportunity.source) {
      // Imported listing — no real employer to notify.
      return NextResponse.json({ ok: true }, { status: 201 });
    }

    const { data: employer } = await admin.auth.admin.getUserById(
      opportunity.employer_id
    );
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    await sendApplicationNotification({
      employerEmail: employer?.user?.email ?? "",
      candidateName: profile.full_name ?? "A candidate",
      opportunityTitle: opportunity.title,
      company: opportunity.company,
      candidateProfileUrl: `${siteUrl}/profile`,
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not submit application" },
      { status: 500 }
    );
  }
}
