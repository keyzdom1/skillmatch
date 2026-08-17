# SkillMatch

Match young people to internships and practical opportunities using AI-powered
similarity search. Candidates build a profile, postings are embedded with
Hugging Face embeddings, and pgvector ranks opportunities by match score.

Built from the plan in `SkillMatch_Architecture_Plan (1).docx`.

## Stack

- **Next.js 14 (App Router) + Tailwind CSS** — pages, API routes, design system
- **Supabase** — Postgres + pgvector, Auth, Storage
- **Hugging Face Inference Providers** — free embeddings
  (`BAAI/bge-small-en-v1.5`, 384-dim)
- **Resend** — transactional email
- **Sentry** — error monitoring (optional)
- **Vercel** — hosting; **GitHub Actions** — CI + uptime ping

## Setup

1. **Supabase**: create a project, then run the migrations in
   `supabase/migrations/` in the SQL editor (order: `0001_init.sql`,
   `0002_match_functions.sql`). They create the schema, RLS policies,
   pgvector indexes, match functions, and storage buckets (`resumes`,
   `avatars`).
2. **Hugging Face**: create an access token at
   https://huggingface.co/settings/tokens and enable **"Make calls to
   Inference Providers"** on it (fine-grained) — a plain Read token cannot call
   inference.
3. **Env**: `cp .env.example .env.local` and fill in the values
   (Supabase project URL + anon key, service role key, HF token).
   Resend/Sentry keys are optional.
4. **Auth**: in Supabase → Authentication → URL Configuration, set the
   site URL (e.g. `http://localhost:3000`) so email confirmation links work.
5. Run it:

   ```bash
   npm install
   npm run dev
   ```

6. Create an account, complete your profile, post an opportunity, and open
   **My matches** to see ranked results with the match stamp.

## Deploy

- Push to GitHub and import the repo into Vercel (Hobby/free tier). Add all
  env vars from `.env.local` to Vercel's project settings.
- Add a `SITE_URL` repository secret for the daily uptime ping workflow
  (keeps the Supabase free project from pausing after 7 days).

## Notes

- Embedding model can be swapped later (e.g. OpenAI `text-embedding-3-small`)
  in `lib/embeddings.ts` — keep the vector dimension in the migrations in sync.
- Charging employers to post internships requires the Vercel Pro tier
  (Hobby is restricted to non-commercial use).