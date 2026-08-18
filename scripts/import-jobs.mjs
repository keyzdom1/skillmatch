#!/usr/bin/env node
// SkillMatch job importer — Remotive + Arbeitnow + RemoteOK → opportunities (with embeddings).
// Usage: node scripts/import-jobs.mjs [--dry-run]
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, HF_API_KEY (from env or .env.local)

import fs from "node:fs";
import path from "node:path";

const isDryRun = process.argv.includes("--dry-run");
const HF_API_URL = "https://router.huggingface.co/hf-inference/models";
const DEFAULT_MODEL = "BAAI/bge-small-en-v1.5";
const BATCH = Number(process.env.IMPORT_BATCH || 30);
const MAX_DESC = 2000;
const MAX_SKILLS = 6;
const CONCURRENCY = 3;

// ---------------------------------------------------------------------------
// env
// ---------------------------------------------------------------------------

function loadEnv() {
  const env = { ...process.env };
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && env[m[1]] === undefined) env[m[1]] = m[2].trim();
    }
  }
  if (!env.SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_URL) {
    env.SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
  }
  const missing = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "HF_API_KEY"].filter(
    (k) => !env[k] || env[k].startsWith("your-")
  );
  if (missing.length && !isDryRun) {
    console.error(`Missing env: ${missing.join(", ")}`);
    process.exit(1);
  }
  return env;
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function stripHtml(html) {
  return String(html ?? "")
    // Decode entities FIRST — sources escape tags as &lt;h2&gt; etc., so tag
    // removal must run after decoding or the tags reappear.
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectType(title) {
  const t = title.toLowerCase();
  if (t.includes("intern") || t.includes("werkstudent") || t.includes("co-op") || t.includes("coop")) {
    return "internship";
  }
  if (t.includes("apprentice") || t.includes("ausbildung") || t.includes("duales studium")) {
    return "apprenticeship";
  }
  if (t.includes("volunteer")) return "volunteer";
  return "job";
}

function cleanSkills(tags) {
  return (Array.isArray(tags) ? tags : [])
    .map((s) => String(s).trim())
    .filter(Boolean)
    .slice(0, MAX_SKILLS);
}

// ---------------------------------------------------------------------------
// sources
// ---------------------------------------------------------------------------

async function fetchRemotive() {
  const res = await fetch("https://remotive.com/api/remote-jobs");
  if (!res.ok) throw new Error(`remotive http ${res.status}`);
  const data = await res.json();
  return (data.jobs ?? []).map((j) => ({
    source: "remotive",
    external_id: String(j.id),
    title: String(j.title ?? "").trim(),
    description: stripHtml(j.description).slice(0, MAX_DESC),
    company: j.company_name || null,
    location: j.candidate_required_location || "Remote",
    type: detectType(j.title),
    skills: cleanSkills(j.tags),
    listing_url: j.url || null,
  }));
}

async function fetchArbeitnow() {
  const res = await fetch("https://www.arbeitnow.com/api/job-board-api");
  if (!res.ok) throw new Error(`arbeitnow http ${res.status}`);
  const data = await res.json();
  return (data.data ?? []).map((j) => ({
    source: "arbeitnow",
    external_id: String(j.slug ?? j.id),
    title: String(j.title ?? "").trim(),
    description: stripHtml(j.description).slice(0, MAX_DESC),
    company: j.company_name || null,
    location: j.location || "EU",
    type: detectType(j.title),
    skills: cleanSkills(j.tags),
    listing_url: j.url || null,
  }));
}

async function fetchRemoteOk() {
  const res = await fetch("https://remoteok.com/api", {
    headers: { "User-Agent": "SkillMatch-Importer/1.0" },
  });
  if (!res.ok) throw new Error(`remoteok http ${res.status}`);
  const data = await res.json();
  return (Array.isArray(data) ? data : [])
    .filter((j) => j && typeof j === "object" && j.position && j.id)
    .map((j) => {
      const loc = String(j.location ?? "").trim();
      const location = /worldwide|global|🌏|🌍|🌎|🌐/i.test(loc)
        ? "Remote (worldwide)"
        : loc || "Remote";
      return {
        source: "remoteok",
        external_id: String(j.id),
        title: String(j.position ?? "").trim(),
        description: stripHtml(j.description).slice(0, MAX_DESC),
        company: j.company || null,
        location,
        type: detectType(j.position),
        skills: cleanSkills(j.tags),
        listing_url: j.url || j.apply_url || null,
      };
    });
}

// ---------------------------------------------------------------------------
// embeddings (same model/normalization as the app)
// ---------------------------------------------------------------------------

function normalizeEmbedding(data) {
  if (!Array.isArray(data) || data.length === 0) throw new Error("empty payload");
  const first = data[0];
  if (typeof first === "number") return data;
  if (Array.isArray(first) && Array.isArray(first[0])) {
    const matrix = first;
    const dim = matrix[0].length;
    const pooled = new Array(dim).fill(0);
    for (const row of matrix) {
      for (let i = 0; i < dim; i++) pooled[i] += row[i] ?? 0;
    }
    return pooled.map((v) => v / matrix.length);
  }
  if (Array.isArray(first) && typeof first[0] === "number") return first;
  throw new Error("unexpected payload");
}

async function getEmbedding(env, text) {
  const model = env.HF_EMBEDDING_MODEL || DEFAULT_MODEL;
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${HF_API_URL}/${model}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: text.slice(0, 8000) }),
    });
    if (res.ok) return normalizeEmbedding(await res.json());
    if (res.status === 401 || res.status === 403) {
      throw new Error(`HF auth failed (${res.status})`);
    }
    lastError = new Error(`HF http ${res.status}`);
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
  }
  throw lastError ?? new Error("HF embedding failed");
}

function buildEmbeddingText(job) {
  return [
    "passage: " + job.title,
    job.company,
    job.location,
    job.type,
    (job.skills ?? []).join(", "),
    job.description,
  ]
    .filter(Boolean)
    .join("\n");
}

async function insertOpportunity(headers, env, job, embedding) {
  const body = JSON.stringify({ ...job, employer_id: null, is_active: true, embedding });
  let res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/opportunities?on_conflict=source,external_id`,
    {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=ignore-duplicates" },
      body,
    }
  );
  if (res.status === 400) {
    const data = await res.json().catch(() => null);
    if (data?.code === "42P10") {
      // No matching unique constraint (migration not applied) — dedupe already
      // happened above, so a plain insert is safe.
      res = await fetch(`${env.SUPABASE_URL}/rest/v1/opportunities`, {
        method: "POST",
        headers,
        body,
      });
    }
  }
  return res;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  const env = loadEnv();
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  };

  console.log(isDryRun ? "DRY RUN — nothing will be written" : "Import starting");

  const all = [];
  for (const fetchSource of [fetchRemotive, fetchArbeitnow, fetchRemoteOk]) {
    try {
      const jobs = await fetchSource();
      all.push(...jobs);
      console.log(`${jobs[0]?.source ?? "source"}: fetched ${jobs.length}`);
    } catch (err) {
      console.error(`source failed: ${err.message}`);
    }
  }
  if (all.length === 0) {
    console.log("no listings fetched");
    return;
  }

  let existing = new Set();
  try {
    const rows = await fetch(
      `${env.SUPABASE_URL}/rest/v1/opportunities?select=source,external_id`,
      { headers }
    ).then((r) => r.json());
    if (Array.isArray(rows)) {
      existing = new Set(
        rows
          .filter((row) => row.source && row.external_id)
          .map((row) => `${row.source}:${row.external_id}`)
      );
    }
  } catch (err) {
    console.error(`could not read existing rows: ${err.message}`);
  }
  console.log(`already imported: ${existing.size}`);

  const seen = new Set();
  const fresh = all.filter((job) => {
    const key = `${job.source}:${job.external_id}`;
    if (existing.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const batch = fresh.slice(0, BATCH);
  console.log(`new after dedupe: ${fresh.length} (processing ${batch.length})`);

  if (isDryRun) {
    for (const job of batch) {
      console.log(`  would insert [${job.type}] ${job.title} @ ${job.company} (${job.source})`);
    }
    return;
  }

  let inserted = 0;
  let failed = 0;

  for (let i = 0; i < batch.length; i += CONCURRENCY) {
    await Promise.all(
      batch.slice(i, i + CONCURRENCY).map(async (job) => {
        try {
          const embedding = await getEmbedding(env, buildEmbeddingText(job));
          const res = await insertOpportunity(headers, env, job, embedding);
          if (res.ok) inserted++;
          else failed++;
        } catch (err) {
          failed++;
          console.error(`  ${job.source}/${job.external_id} failed: ${err.message}`);
        }
      })
    );
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`done: processed ${inserted}, failed ${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});