import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { extractResumeText } from "@/lib/resumeExtract";
import {
  generateChat,
  buildResumeCoachPrompt,
  buildResumeRewritePrompt,
  buildResumeRewriteFromAdvicePrompt,
  isAiConfigured,
} from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

  const opportunityId =
    typeof body.opportunityId === "string" && body.opportunityId
      ? body.opportunityId
      : null;
  const resumeText =
    typeof body.resumeText === "string" && body.resumeText.trim()
      ? body.resumeText.trim()
      : null;
  const resumePath =
    typeof body.resumePath === "string" && body.resumePath.trim()
      ? body.resumePath.trim()
      : null;
  const mode = body.mode === "rewrite" ? "rewrite" : "advice";

  try {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, headline, bio, skills, education, experience, resume_url")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    let opportunity: {
      title: string;
      company: string | null;
      description: string;
      skills: string[];
    } | null = null;

    if (opportunityId) {
      const { data: opp, error: oppError } = await supabase
        .from("opportunities")
        .select("title, company, description, skills, is_active")
        .eq("id", opportunityId)
        .maybeSingle();
      if (oppError) {
        return NextResponse.json({ error: oppError.message }, { status: 500 });
      }
      if (opp && opp.is_active) {
        opportunity = opp;
      }
    }

    if (!isAiConfigured()) {
      return NextResponse.json(
        { error: "HF_API_KEY is not set — add your Hugging Face token to enable the resume coach." },
        { status: 500 }
      );
    }

    // The profile is optional context: a pasted or uploaded resume is enough.
    const profileData = profile ?? {
      full_name: null as string | null,
      headline: null as string | null,
      bio: null as string | null,
      skills: [] as string[],
      education: null as string | null,
      experience: null as string | null,
      resume_url: null as string | null,
    };

    let resumeUsed: string | null = resumeText;

    const storedResume =
      !resumeUsed &&
      profileData.resume_url &&
      !profileData.resume_url.startsWith("http")
        ? await extractResumeText(profileData.resume_url)
        : null;
    if (storedResume) resumeUsed = storedResume;

    // A resume uploaded right here on the coach page (not yet saved to the profile).
    if (!resumeUsed && resumePath) {
      const freshUpload = await extractResumeText(resumePath);
      if (freshUpload) resumeUsed = freshUpload;
    }

    const shared = {
      opportunity,
      profile: {
        fullName: profileData.full_name,
        headline: profileData.headline,
        bio: profileData.bio,
        skills: profileData.skills ?? [],
        education: profileData.education,
        experience: profileData.experience,
      },
      resumeText: resumeUsed,
    };

    let prompt: string;
    if (mode === "rewrite" && resumeUsed) {
      const coachAdvice = await generateChat(
        buildResumeCoachPrompt(shared),
        1000
      );
      prompt = buildResumeRewriteFromAdvicePrompt(shared, coachAdvice);
    } else if (mode === "rewrite") {
      prompt = buildResumeRewritePrompt(shared);
    } else {
      prompt = buildResumeCoachPrompt(shared);
    }

    const advice = await generateChat(prompt, mode === "rewrite" ? 2000 : 1000);

    return NextResponse.json({
      advice,
      opportunity,
      mode,
      usedStoredResume: storedResume !== null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not generate advice" },
      { status: 500 }
    );
  }
}