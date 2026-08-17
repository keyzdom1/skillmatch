#!/usr/bin/env node
// One-off cleanup: strip HTML from imported descriptions and re-embed.
// Fixes rows imported before stripHtml decoded entities before tag removal.
// Usage: node scripts/clean-html.mjs [--dry-run]

import fs from "node:fs";
import path from "node:path";

const isDryRun = process.argv.includes("--dry-run");
const HF_API_URL = "https://router.huggingface.co/hf-inference/models";
const DEFAULT_MODEL = "BAAI/bge-small-en-v1.5";
const CONCURRENCY = 3;

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
  return env;
}

function stripHtml(html) {
  return String(html ?? "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

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
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(`${HF_API_URL}/${model}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: text.slice(0, 8000) }),
      signal: AbortSignal.timeout(20000),
    });
    if (res.ok) return normalizeEmbedding(await res.json());
    if (res.status === 401 || res.status === 403) {
      throw new Error(`HF auth failed (${res.status})`);
    }
    lastError = new Error(`HF http ${res.status}`);
    await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
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

const env = loadEnv();
const headers = {
  apikey: env.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
};

const rows = await fetch(
  `${env.SUPABASE_URL}/rest/v1/opportunities?select=id,source,external_id,title,company,location,type,skills,description&source=neq.null`,
  { headers }
).then((r) => {
  if (!r.ok) throw new Error(`fetch rows http ${r.status}`);
  return r.json();
});

const dirty = rows.filter((r) => /<[a-z]|&lt;/i.test(r.description ?? ""));
console.log(`rows fetched: ${rows.length} | containing HTML: ${dirty.length}`);

let fixed = 0;
let failed = 0;
let queue = 0;
const work = dirty.map(async (row) => {
  queue++;
  while (queue > CONCURRENCY) await new Promise((r) => setTimeout(r, 250));
  try {
    const cleaned = stripHtml(row.description);
    const job = { ...row, description: cleaned };
    const embedding = await getEmbedding(env, buildEmbeddingText(job));
    if (!isDryRun) {
      const res = await fetch(
        `${env.SUPABASE_URL}/rest/v1/opportunities?id=eq.${row.id}`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({ description: cleaned, embedding }),
          signal: AbortSignal.timeout(15000),
        }
      );
      if (!res.ok) throw new Error(`PATCH http ${res.status}`);
    }
    fixed++;
    console.log(`  fixed ${row.source}/${row.external_id} → ${cleaned.slice(0, 60)}`);
  } catch (err) {
    failed++;
    console.error(`  FAILED ${row.source}/${row.external_id}: ${err.message}`);
  } finally {
    queue--;
  }
});
await Promise.all(work);

console.log(isDryRun ? "DRY RUN" : "done");
console.log(`fixed: ${fixed} | failed: ${failed}`);
