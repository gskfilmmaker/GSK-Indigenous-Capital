import type { EmailOtpType } from "@gsk/db";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { createClient } from "../../../lib/supabase/server";

/**
 * Verifies a signup-confirmation or password-recovery email link and
 * establishes the resulting session via cookies, then redirects to
 * `next`. This is the official Supabase/Next.js SSR pattern
 * (https://supabase.com/docs/guides/auth/server-side/nextjs).
 *
 * IMPORTANT — manual dashboard step required: Supabase's built-in "Confirm
 * signup" and "Reset Password" email templates link to Supabase's own
 * hosted verify endpoint by default, not to this route. Until the
 * templates are changed (Supabase dashboard → Authentication → Email
 * Templates) to link to
 * `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type={{ .Type }}&next=/account`
 * (and, for "Reset Password", `next=/reset-password`), this route never
 * receives traffic. The app's URL must also be added to Authentication →
 * URL Configuration → Redirect URLs. Neither is reachable from this
 * sandbox (dashboard-only, no Management API access) — see this task's
 * final report.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type: EmailOtpType | null = searchParams.get("type");
  const next = searchParams.get("next") ?? "/account";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      redirect(next);
    }
  }

  redirect(
    `/login?error=${encodeURIComponent("This confirmation link is invalid or has expired.")}`,
  );
}
