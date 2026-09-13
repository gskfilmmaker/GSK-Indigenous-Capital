import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "../../../../../../lib/supabase/server";
import { IntakeForm } from "./IntakeForm";
import styles from "../../screening.module.css";

export const metadata: Metadata = {
  title: "New startup intake — GSK Indigenous Capital",
};

export default async function NewIntakePage({
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

  return (
    <>
      <h1 className={styles.title}>New startup intake</h1>
      <p className={styles.subtitle}>
        Only company name, industry, and stage are required. Add whatever other sections you have
        data for — upload documents to draft them automatically, or fill them in directly.
      </p>
      <IntakeForm orgSlug={organization.slug} idempotencyKey={randomUUID()} />
    </>
  );
}
