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
    if (!profile) {
      return NextResponse.json(
        { error: "Complete your profile first so the coach has something to work with." },
        { status: 400 }
      );
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

    let resumeUsed: string | null = resumeText;

    const storedResume =
      typeof resumeText !== "string" && profile.resume_url
        ? await extractResumeText(profile.resume_url)
        : null;
    if (storedResume) resumeUsed = storedResume;

    const shared = {
      opportunity,
      profile: {
        fullName: profile.full_name,
        headline: profile.headline,
        bio: profile.bio,
        skills: profile.skills ?? [],
        education: profile.education,
        experience: profile.experience,
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
