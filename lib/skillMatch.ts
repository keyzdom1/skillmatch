// Skill normalization and overlap scoring for match ranking.

const SKILL_ALIASES: Record<string, string> = {
  js: "javascript",
  javascript: "javascript",
  ts: "typescript",
  typescript: "typescript",
  reactjs: "react",
  react: "react",
  "react.js": "react",
  "react.jsx": "react",
  vuejs: "vue",
  vue: "vue",
  "vue.js": "vue",
  angularjs: "angular",
  angular: "angular",
  nodejs: "node.js",
  node: "node.js",
  "node.js": "node.js",
  nextjs: "next.js",
  next: "next.js",
  "next.js": "next.js",
  html5: "html",
  html: "html",
  css3: "css",
  css: "css",
  sass: "scss",
  scss: "scss",
  python3: "python",
  python: "python",
  py: "python",
  cpp: "c++",
  "c++": "c++",
  "c sharp": "c#",
  "c#": "c#",
  ".net core": ".net",
  "asp.net": ".net",
  dotnet: ".net",
  ".net": ".net",
  golang: "go",
  go: "go",
  kotlin: "kotlin",
  swift: "swift",
  java: "java",
  php: "php",
  ruby: "ruby",
  rust: "rust",
  sql: "sql",
  "sql server": "sql",
  postgres: "postgresql",
  postgresql: "postgresql",
  mysql: "mysql",
  mongodb: "mongodb",
  mongo: "mongodb",
  aws: "aws",
  "amazon web services": "aws",
  azure: "azure",
  "gcp": "gcp",
  "google cloud": "gcp",
  docker: "docker",
  kubernetes: "kubernetes",
  k8s: "kubernetes",
  git: "git",
  github: "github",
  gitlab: "gitlab",
  figma: "figma",
  photoshop: "photoshop",
  "ui/ux": "ui/ux",
  ux: "ui/ux",
  ui: "ui/ux",
  excel: "excel",
  powerpoint: "powerpoint",
  word: "word",
  "google sheets": "excel",
  communication: "communication",
  teamwork: "teamwork",
  collaboration: "teamwork",
  leadership: "leadership",
  "problem solving": "problem solving",
  "problem-solving": "problem solving",
  "critical thinking": "critical thinking",
  "project management": "project management",
  agile: "agile",
  scrum: "scrum",
  "machine learning": "machine learning",
  "ml": "machine learning",
  "deep learning": "deep learning",
  "data analysis": "data analysis",
  "data analytics": "data analysis",
  "data science": "data science",
  "data engineering": "data engineering",
  pandas: "pandas",
  numpy: "numpy",
  tensorflow: "tensorflow",
  pytorch: "pytorch",
  llm: "llm",
  "large language models": "llm",
  "generative ai": "generative ai",
  "artificial intelligence": "ai",
  ai: "ai",
  "customer service": "customer service",
  "customer support": "customer service",
  sales: "sales",
  marketing: "marketing",
  "social media": "social media",
  "content writing": "content writing",
  copywriting: "content writing",
  "english": "english",
  "german": "german",
  "french": "french",
  "spanish": "spanish",
};

export function normalizeSkill(skill: string): string {
  const raw = String(skill ?? "").trim().toLowerCase();
  if (!raw) return "";
  if (SKILL_ALIASES[raw]) return SKILL_ALIASES[raw];
  const cleaned = raw
    .replace(/[^a-z0-9+#. ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return SKILL_ALIASES[cleaned] ?? cleaned;
}

export function normalizeSkills(skills: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const skill of skills) {
    const norm = normalizeSkill(skill);
    if (norm && !seen.has(norm)) {
      seen.add(norm);
      out.push(norm);
    }
  }
  return out;
}

// How much of the job's required skills the candidate has.
// Job title words are also counted as "target skills" so candidates who list
// a skill that literally appears in the role title still get credit.
export function skillOverlap(
  profileSkills: string[],
  jobSkills: string[],
  jobTitle?: string | null
): { matched: string[]; ratio: number } {
  const profile = new Set(normalizeSkills(profileSkills));
  const target = new Set(normalizeSkills(jobSkills));
  if (jobTitle) {
    for (const word of jobTitle.toLowerCase().split(/[^a-z0-9+#.]+/)) {
      if (!word) continue;
      const norm = SKILL_ALIASES[word] ?? word;
      if (profile.has(norm)) target.add(norm);
    }
  }
  const matched = Array.from(target).filter((s) => profile.has(s));
  const ratio = target.size > 0 ? matched.length / target.size : 0;
  return { matched, ratio };
}

// Heuristic: does this profile look like a student/graduate (boosts
// internship-type opportunities)?
export function profileSignalsStudent(profile: {
  headline?: string | null;
  bio?: string | null;
  education?: string | null;
  experience?: string | null;
}): boolean {
  const text = [profile.headline, profile.bio, profile.education, profile.experience]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return /\b(student|graduate|fresh grad|internship|undergrad|university|college|school|bachelor|master's|masters)\b/.test(
    text
  );
}