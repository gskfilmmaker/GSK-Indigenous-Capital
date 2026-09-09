"use client";

import { createSupabaseBrowserClient, type SupabaseBrowserClient } from "@gsk/db";
import { getSupabasePublicEnv } from "./env";

/**
 * Browser Supabase client for Client Components. Per the official
 * Supabase/Next.js guidance, create a fresh client per call site rather
 * than sharing one module-level singleton across the app.
 */
export function createClient(): SupabaseBrowserClient {
  const { url, anonKey } = getSupabasePublicEnv();
  return createSupabaseBrowserClient(url, anonKey);
}
