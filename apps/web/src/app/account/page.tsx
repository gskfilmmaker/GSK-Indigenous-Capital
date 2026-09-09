import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";

/**
 * A neutral post-sign-in landing route (this is where actions.ts's
 * signInAction/signUpAction/etc. redirect to) that hands off to
 * /onboarding, which already knows how to route a signed-in user to the
 * right next step: create an organization, add a company, or — once
 * both exist — straight to /app/:orgSlug/dashboard. Never rendered
 * itself; existing only so the auth actions have one stable redirect
 * target that doesn't need to know the user's organization state.
 */
export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  redirect("/onboarding");
}
