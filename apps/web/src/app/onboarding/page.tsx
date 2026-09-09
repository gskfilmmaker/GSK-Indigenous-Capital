import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import { OrganizationForm } from "./OrganizationForm";
import styles from "./onboarding.module.css";

export const metadata: Metadata = {
  title: "Set up your organization — GSK Indigenous Capital",
};

/**
 * Onboarding step 1 (spec §6.2): create the organization. If the signed-
 * in user already belongs to one, skip straight to their most recently
 * created organization's company step (or dashboard, if that step is
 * already done) rather than showing this form again.
 */
export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: memberships } = await supabase
    .from("organization_memberships")
    .select("organization_id, organization:organizations(slug)")
    .order("created_at", { ascending: false })
    .limit(1);

  const membership = memberships?.[0];
  if (membership?.organization?.slug) {
    const { data: companies } = await supabase
      .from("companies")
      .select("id")
      .eq("organization_id", membership.organization_id)
      .limit(1);

    redirect(
      companies && companies.length > 0
        ? `/app/${membership.organization.slug}/dashboard`
        : `/onboarding/${membership.organization.slug}/company`,
    );
  }

  return (
    <>
      <p className={styles.stepNote}>Step 1 of 2</p>
      <h1 className={styles.title}>Set up your organization</h1>
      <p className={styles.subtitle}>
        This is your workspace — you can invite your team and add companies to it later.
      </p>
      <OrganizationForm />
    </>
  );
}
