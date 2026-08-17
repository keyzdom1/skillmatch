import { createClient } from "@supabase/supabase-js";
import { createBrowserClient as createSsrBrowserClient } from "@supabase/ssr";

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.startsWith("your-") || value.startsWith("change-me")) {
    throw new Error(
      `Missing environment variable: ${name}. Copy .env.example to .env.local and fill in real values.`
    );
  }
  return value;
}

export function createBrowserClient() {
  return createSsrBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  );
}

export function createAdminClient() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
