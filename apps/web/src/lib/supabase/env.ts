/**
 * Reads NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY with a
 * clear failure instead of a `!` non-null assertion — a missing env var
 * should fail loudly at the call site, not surface later as an opaque
 * error from deep inside supabase-js. Both must be read as literal
 * `process.env.NEXT_PUBLIC_*` member expressions (not through a dynamic
 * key) so Next.js's build-time inlining can find and replace them.
 */
export function getSupabasePublicEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!anonKey) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return { url, anonKey };
}

/**
 * The app's own canonical URL (no trailing slash), used to build absolute
 * email-confirmation/password-reset redirect links — Supabase requires an
 * absolute URL for these, and it must be present in the project's Auth →
 * URL Configuration → Redirect URLs allowlist.
 */
export function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_APP_URL");
  }
  return url.replace(/\/+$/, "");
}
