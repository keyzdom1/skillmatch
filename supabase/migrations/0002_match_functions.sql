-- pgvector similarity search functions, used via supabase.rpc().

-- Candidates: find opportunities matching a candidate profile.
create or replace function public.match_opportunities(
  query_embedding vector(384),
  match_count int default 20,
  match_threshold float default 0.2
)
returns table (
  id uuid,
  employer_id uuid,
  title text,
  description text,
  company text,
  location text,
  type text,
  deadline date,
  skills text[],
  created_at timestamptz,
  similarity float
)
language sql
stable
as $$
  select
    o.id, o.employer_id, o.title, o.description, o.company, o.location,
    o.type, o.deadline, o.skills, o.created_at,
    1 - (o.embedding <=> query_embedding) as similarity
  from public.opportunities o
  where o.is_active
    and o.embedding is not null
    and 1 - (o.embedding <=> query_embedding) > match_threshold
  order by o.embedding <=> query_embedding
  limit match_count;
$$;

-- Employers: find candidate profiles matching an opportunity.
create or replace function public.match_profiles(
  query_embedding vector(384),
  match_count int default 20,
  match_threshold float default 0.2
)
returns table (
  id uuid,
  full_name text,
  headline text,
  bio text,
  skills text[],
  education text,
  experience text,
  avatar_url text,
  similarity float
)
language sql
stable
as $$
  select
    p.id, p.full_name, p.headline, p.bio, p.skills, p.education,
    p.experience, p.avatar_url,
    1 - (p.embedding <=> query_embedding) as similarity
  from public.profiles p
  where p.embedding is not null
    and 1 - (p.embedding <=> query_embedding) > match_threshold
  order by p.embedding <=> query_embedding
  limit match_count;
$$;
