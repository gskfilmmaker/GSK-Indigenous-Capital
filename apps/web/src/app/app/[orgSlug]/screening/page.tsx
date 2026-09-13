import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";
import styles from "./screening.module.css";

export const metadata: Metadata = {
  title: "Deal Screening — GSK Indigenous Capital",
};

const STAGE_LABELS: Record<string, string> = {
  pre_seed: "Pre-seed",
  seed: "Seed",
  series_a: "Series A",
  growth: "Growth",
};

export default async function ScreeningHubPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const supabase = await createClient();

  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("slug", orgSlug)
    .single();

  if (!organization) {
    notFound();
  }

  const [{ data: theses }, { data: intakes }] = await Promise.all([
    supabase
      .from("investor_theses")
      .select("id, name, updated_at")
      .eq("organization_id", organization.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("startup_intakes")
      .select("id, company_name, industry, stage, updated_at")
      .eq("organization_id", organization.id)
      .order("updated_at", { ascending: false }),
  ]);

  return (
    <>
      <h1 className={styles.title}>Deal Screening</h1>
      <p className={styles.subtitle}>
        Run the frameworks from the investor field guide against a startup&apos;s submitted data —
        every number shown as evidence, never collapsed into a single score or recommendation.
      </p>

      <h2 className={styles.sectionTitle}>Startup intakes</h2>
      <Link href={`/app/${orgSlug}/screening/intakes/new`} className={styles.newLink}>
        + New intake
      </Link>
      {intakes && intakes.length > 0 ? (
        <ul className={styles.list}>
          {intakes.map((intake) => (
            <li key={intake.id}>
              <Link href={`/app/${orgSlug}/screening/intakes/${intake.id}`} className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardName}>{intake.company_name}</span>
                  <span className={styles.cardMeta}>
                    {STAGE_LABELS[intake.stage] ?? intake.stage}
                  </span>
                </div>
                <p className={styles.cardMeta}>
                  {intake.industry} · last updated{" "}
                  {new Date(intake.updated_at).toLocaleString("en-CA")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.emptyState}>No startup intakes yet.</p>
      )}

      <h2 className={styles.sectionTitle}>Investor theses</h2>
      <Link href={`/app/${orgSlug}/screening/theses/new`} className={styles.newLink}>
        + New thesis
      </Link>
      {theses && theses.length > 0 ? (
        <ul className={styles.list}>
          {theses.map((thesis) => (
            <li key={thesis.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardName}>{thesis.name}</span>
              </div>
              <p className={styles.cardMeta}>
                Last updated {new Date(thesis.updated_at).toLocaleString("en-CA")}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.emptyState}>
          No thesis yet — you can still screen intakes without one; a thesis just lets you compare
          a startup&apos;s numbers against your own thresholds.
        </p>
      )}
    </>
  );
}
