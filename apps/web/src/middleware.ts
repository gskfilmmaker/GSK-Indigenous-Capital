import { createSupabaseServerClient } from "@gsk/db";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicEnv } from "./lib/supabase/env";

/**
 * Refreshes the Supabase session cookie on every matched request (official
 * Supabase/Next.js SSR pattern). Server Components cannot write cookies
 * themselves (see server.ts's `setAll` try/catch), so without this
 * middleware a session nearing expiry would never actually refresh and
 * users would be logged out unexpectedly.
 *
 * This does not gate routes yet — Task #42 (authenticated app shell) adds
 * redirect-to-/login for protected routes once there is somewhere
 * meaningful to redirect back to. RLS is still the real authorization
 * boundary regardless (root CLAUDE.md invariant 1): this middleware only
 * keeps the session cookie itself alive.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const { url, anonKey } = getSupabasePublicEnv();
  const supabase = createSupabaseServerClient(url, anonKey, {
    getAll() {
      return request.cookies.getAll();
    },
    setAll(cookiesToSet) {
      for (const { name, value } of cookiesToSet) {
        request.cookies.set(name, value);
      }
      response = NextResponse.next({ request });
      for (const { name, value, options } of cookiesToSet) {
        response.cookies.set(name, value, options);
      }
    },
  });

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
