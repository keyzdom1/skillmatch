import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { createAdminClient } from "@/lib/supabase";
import { getEmbedding, buildOpportunityEmbeddingText, isHfConfigured } from "@/lib/embeddings";
import { OPPORTUNITY_TYPES } from "@/lib/types";

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
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { title, description, company, location, type, deadline, skills } = body;
  if (typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (typeof description !== "string" || !description.trim()) {
    return NextResponse.json({ error: "Description is required" }, { status: 400 });
  }

  const opportunity = {
    employer_id: user.id,
    title: title.trim(),
    description: description.trim(),
    company: typeof company === "string" && company.trim() ? company.trim() : null,
    location: typeof location === "string" && location.trim() ? location.trim() : null,
    type: OPPORTUNITY_TYPES.includes(type) ? type : "internship",
    deadline:
      typeof deadline === "string" && deadline && !isNaN(Date.parse(deadline))
        ? deadline
        : null,
    skills: Array.isArray(skills) ? skills.filter((s) => typeof s === "string") : [],
  };

  try {
    let warning: string | null = null;
    let embedding: number[] | null = null;

    if (isHfConfigured()) {
      embedding = await getEmbedding(
        buildOpportunityEmbeddingText({ ...opportunity, skills: opportunity.skills })
      );
    } else {
      warning =
        "Opportunity posted, but no Hugging Face token is configured, so it won't appear in match results until HF_API_KEY is set in .env.local.";
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("opportunities")
      .insert({ ...opportunity, ...(embedding ? { embedding } : {}) })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ opportunity: data, warning }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create opportunity" },
      { status: 500 }
    );
  }
}
