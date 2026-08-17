"use server";

import { redirect } from "next/navigation";
import { createServerSupabase } from "./supabaseServer";

export async function logout() {
  const supabase = createServerSupabase();
  await supabase.auth.signOut();
  redirect("/");
}
