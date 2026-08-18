import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { createAdminClient } from "@/lib/supabase";
import { getEmbedding, buildProfileEmbeddingText } from "@/lib/embeddings";
import { extractResumeText } from "@/lib/resumeExtract";
import {
  skillOverlap,
  profileSignalsStudent,
  skillsFromText,
} from "@/lib/skillMatch";
import type { MatchResult } from "@/lib/types";

export const dynamic = "force-dynamic";

const MIN_SCORE = 0.22;
const MAX_MATCHES = 20;

function clampScore(value: number): number {
  return Math.max(0, Math.min(1, value));
}

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

    const resumeText =
      profile.resume_url && !profile.resume_url.startsWith("http")
        ? await extractResumeText(profile.resume_url)
        : null;

    const embedding = await getEmbedding(
      buildProfileEmbeddingText(profile) +
        (resumeText ? `\nResume:\n${resumeText.slice(0, 4000)}` : "")
    );

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
      match_count: 40,
      match_threshold: 0.15,
    })) as { data: MatchRow[] | null; error: { message: string } | null };

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const resumeSkills = skillsFromText(
      [
        profile.headline,
        profile.bio,
        profile.education,
        profile.experience,
        resumeText,
      ]
        .filter(Boolean)
        .join("\n")
    );
    const profileSkills = Array.from(
      new Set([...(profile.skills ?? []), ...resumeSkills])
    );
    const isStudent = profileSignalsStudent(profile);

    const matches = (data ?? [])
      .map((m) => {
        const { matched, ratio } = skillOverlap(
          profileSkills,
          m.skills ?? [],
          m.title
        );
        const internshipBonus =
          isStudent && m.type === "internship" ? 0.12 : 0;
        const similarity = clampScore(
          0.5 * m.similarity + 0.5 * ratio + internshipBonus
        );

        const matchReasons: string[] = [];
        if (matched.length > 0) {
          matchReasons.push(
            `${matched.length} shared skill${matched.length === 1 ? "" : "s"}${
              matched.length <= 3 ? `: ${matched.join(", ")}` : ""
            }`
          );
        }
        if (internshipBonus > 0) {
          matchReasons.push("Internship — a great fit for students");
        }
        if (matched.length === 0) {
          matchReasons.push("Related to your background");
        }

        return {
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
          similarity,
          match_reasons: matchReasons,
        };
      })
      .filter((m) => m.similarity >= MIN_SCORE)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, MAX_MATCHES) as MatchResult[];

    return NextResponse.json({ matches, resumeUsed: Boolean(resumeText) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Matching failed" },
      { status: 500 }
    );
  }
}
