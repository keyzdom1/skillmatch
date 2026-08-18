import { extractText } from "unpdf";
import { createAdminClient } from "./supabase";

const MAX_RESUME_TEXT = 6000;

// Extract the text of a stored resume PDF (storage path in the resumes bucket).
// Returns null when there is nothing usable (no file, non-PDF, legacy http link,
// or parse failure) so callers can fall back to pasted text or the profile.
export async function extractResumeText(
  resumeUrl: string | null
): Promise<string | null> {
  if (!resumeUrl || resumeUrl.startsWith("http")) return null;
  const ext = resumeUrl.split(".").pop()?.toLowerCase();
  if (ext !== "pdf") return null;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.storage
      .from("resumes")
      .createSignedUrl(resumeUrl, 60);
    if (error || !data?.signedUrl) return null;

    const res = await fetch(data.signedUrl, { cache: "no-store" });
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());

    const { text } = await extractText(bytes, { mergePages: true });
    return text.trim().slice(0, MAX_RESUME_TEXT) || null;
  } catch {
    return null;
  }
}