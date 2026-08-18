export interface Profile {
  id: string;
  full_name: string | null;
  headline: string | null;
  bio: string | null;
  skills: string[];
  education: string | null;
  experience: string | null;
  resume_url: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Opportunity {
  id: string;
  employer_id: string;
  title: string;
  description: string;
  company: string | null;
  location: string | null;
  type: string;
  deadline: string | null;
  skills: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OpportunityWithMatch extends Opportunity {
  similarity: number;
}

export interface MatchResult {
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
  match_reasons?: string[];
}

export const OPPORTUNITY_TYPES = [
  "internship",
  "apprenticeship",
  "traineeship",
  "project",
  "volunteer",
  "job",
] as const;
