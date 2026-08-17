// Hugging Face Inference Providers router — free-tier embeddings.
// (api-inference.huggingface.co was retired; router.huggingface.co is the
// current endpoint. Requires a token with inference permission enabled.)
// Swap HF_EMBEDDING_MODEL (or the whole provider) later per the upgrade path
// in the architecture plan (e.g. OpenAI text-embedding-3-small).
//
// bge-small-en-v1.5: the router exposes it with a plain-text FeatureExtraction
// input and returns 384-dim vectors (matches the vector(384) columns). It
// follows the BGE convention of "query:"/"passage:" prefixes for retrieval.

const HF_API_URL = "https://router.huggingface.co/hf-inference/models";
const DEFAULT_MODEL = "BAAI/bge-small-en-v1.5";

export function isHfConfigured(): boolean {
  const apiKey = process.env.HF_API_KEY;
  return Boolean(
    apiKey &&
      !apiKey.startsWith("your-") &&
      !apiKey.startsWith("change-me")
  );
}

function hfConfig() {
  if (!isHfConfigured()) {
    throw new Error(
      "Missing HF_API_KEY. Add your Hugging Face token to .env.local."
    );
  }
  return {
    apiKey: process.env.HF_API_KEY as string,
    model: process.env.HF_EMBEDDING_MODEL || DEFAULT_MODEL,
  };
}

// HF returns different shapes depending on the model (pooled sentence vector,
// token vectors, etc.). Normalize to a single 384-dim vector.
function normalizeEmbedding(data: unknown): number[] {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("Hugging Face returned an unexpected embedding payload");
  }
  const first = data[0];
  if (typeof first === "number") {
    return data as number[];
  }
  if (Array.isArray(first) && Array.isArray(first[0])) {
    const matrix = first as number[][];
    const dim = matrix[0].length;
    const pooled = new Array(dim).fill(0);
    for (const row of matrix) {
      for (let i = 0; i < dim; i++) pooled[i] += row[i] ?? 0;
    }
    return pooled.map((v) => v / matrix.length);
  }
  if (Array.isArray(first) && typeof first[0] === "number") {
    return first as number[];
  }
  throw new Error("Hugging Face returned an unexpected embedding payload");
}

export async function getEmbedding(text: string): Promise<number[]> {
  const { apiKey, model } = hfConfig();
  const res = await fetch(`${HF_API_URL}/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs: text.slice(0, 8000) }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Hugging Face embeddings request failed (${res.status})`);
  }
  const data = await res.json();
  return normalizeEmbedding(data);
}

export function buildProfileEmbeddingText(profile: {
  headline?: string | null;
  bio?: string | null;
  skills?: string[];
  education?: string | null;
  experience?: string | null;
}): string {
  return [
    "query: " + profile.headline,
    profile.bio,
    (profile.skills ?? []).join(", "),
    profile.education,
    profile.experience,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildOpportunityEmbeddingText(opportunity: {
  title: string;
  description: string;
  company?: string | null;
  location?: string | null;
  type?: string | null;
  skills?: string[];
}): string {
  return [
    "passage: " + opportunity.title,
    opportunity.company,
    opportunity.location,
    opportunity.type,
    (opportunity.skills ?? []).join(", "),
    opportunity.description,
  ]
    .filter(Boolean)
    .join("\n");
}
