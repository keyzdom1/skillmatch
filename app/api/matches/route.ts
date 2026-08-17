import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { createAdminClient } from "@/lib/supabase";
import { getEmbedding, buildProfileEmbeddingText } from "@/lib/embeddings";
import type { MatchResult } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }
    if (!profile) {
      return NextResponse.json(
        { error: "Complete your profile first so we can match you" },
        { status: 404 }
      );
    }

    const embedding = await getEmbedding(buildProfileEmbeddingText(profile));

    type MatchRow = {
      id: string;
      employer_id: string;
      title: string;
      description: string;
      company: string | null;
      location: string | null;
      type: string;
      deadline: string | null;
      skills: string[];
      created_at: string;
      similarity: number;
    };

    const { data, error } = (await admin.rpc("match_opportunities", {
      query_embedding: embedding,
      match_count: 20,
      match_threshold: 0.15,
    })) as { data: MatchRow[] | null; error: { message: string } | null };

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const matches = (data ?? []).map((m) => ({
      id: m.id,
      employer_id: m.employer_id,
      title: m.title,
      description: m.description,
      company: m.company,
      location: m.location,
      type: m.type,
      deadline: m.deadline,
      skills: m.skills ?? [],
      created_at: m.created_at,
      similarity: m.similarity,
    })) as MatchResult[];

    return NextResponse.json({ matches });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Matching failed" },
      { status: 500 }
    );
  }
}
