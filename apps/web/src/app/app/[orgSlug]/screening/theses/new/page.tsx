import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "../../../../../../lib/supabase/server";
import { ThesisForm } from "./ThesisForm";
import styles from "../../screening.module.css";

export const metadata: Metadata = {
  title: "New investor thesis — GSK Indigenous Capital",
};

export default async function NewThesisPage({
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
      <h1 className={styles.title}>New investor thesis</h1>
      <p className={styles.subtitle}>
        Set your own thresholds once, then compare any startup&apos;s submitted data against them.
      </p>
      <ThesisForm orgSlug={organization.slug} idempotencyKey={randomUUID()} />
    </>
  );
}
