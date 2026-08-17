import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { createAdminClient } from "@/lib/supabase";
import { getEmbedding, buildProfileEmbeddingText, isHfConfigured } from "@/lib/embeddings";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ profile: data });
}

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

  const profile = {
    id: user.id,
    full_name: typeof body.full_name === "string" ? body.full_name.trim() || null : null,
    headline: typeof body.headline === "string" ? body.headline.trim() || null : null,
    bio: typeof body.bio === "string" ? body.bio.trim() || null : null,
    skills: Array.isArray(body.skills)
      ? (body.skills as unknown[]).filter((s) => typeof s === "string")
      : [],
    education: typeof body.education === "string" ? body.education.trim() || null : null,
    experience: typeof body.experience === "string" ? body.experience.trim() || null : null,
    resume_url: typeof body.resume_url === "string" ? body.resume_url || null : null,
    avatar_url: typeof body.avatar_url === "string" ? body.avatar_url || null : null,
  };

  try {
    let warning: string | null = null;
    let embedding: number[] | null = null;

    if (isHfConfigured()) {
      embedding = await getEmbedding(buildProfileEmbeddingText(profile));
    } else {
      warning =
        "Profile saved, but no Hugging Face token is configured, so matching is unavailable. Set HF_API_KEY in .env.local to enable matches.";
    }

    const admin = createAdminClient();
    // When HF is not configured, omit the embedding so an existing vector is kept.
    const { error } = await admin.from("profiles").upsert(
      {
        ...profile,
        ...(embedding ? { embedding } : {}),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, warning });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save profile" },
      { status: 500 }
    );
  }
}
