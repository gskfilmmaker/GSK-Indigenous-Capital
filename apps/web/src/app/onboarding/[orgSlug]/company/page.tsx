import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";
import { CompanyForm } from "./CompanyForm";
import styles from "../../onboarding.module.css";

export const metadata: Metadata = {
  title: "Add your company — GSK Indigenous Capital",
};

export default async function OnboardingCompanyPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: organization } = await supabase
    .from("organizations")
    .select("id, slug")
    .eq("slug", orgSlug)
    .single();

  if (!organization) {
    notFound();
  }

  const { data: existingCompanies } = await supabase
    .from("companies")
    .select("id")
    .eq("organization_id", organization.id)
    .limit(1);

  if (existingCompanies && existingCompanies.length > 0) {
    redirect(`/app/${organization.slug}/dashboard`);
  }

  return (
    <>
      <p className={styles.stepNote}>Step 2 of 2</p>
      <h1 className={styles.title}>Add your company</h1>
      <p className={styles.subtitle}>
        Only a legal name is required to continue — everything else can be filled in or corrected
        later.
      </p>
      <CompanyForm orgSlug={organization.slug} idempotencyKey={randomUUID()} />
    </>
  );
}
