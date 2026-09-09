import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";
import styles from "./dashboard.module.css";

export const metadata: Metadata = {
  title: "Dashboard — GSK Indigenous Capital",
};

const INCORPORATION_STATUTE_LABELS: Record<string, string> = {
  UNKNOWN: "Incorporation statute not yet on file",
  OBCA: "Ontario Business Corporations Act",
  CBCA: "Canada Business Corporations Act",
  OTHER: "Other statute",
};

/**
 * Spec §6.3 lists cards for financing target/committed/funded, modelled
 * dilution vs. approved ceiling, and documents/tasks awaiting review —
 * none of those exist yet (financings, board approvals, and documents
 * are later phases). Showing them here with placeholder or zeroed values
 * would misrepresent real state, so this dashboard shows only what is
 * actually true today: the organization's companies, and a link to the
 * (still session-only, unpersisted) Scenario Studio. The remaining cards
 * are added as their underlying data exists, not mocked ahead of it.
 */
export default async function DashboardPage({ params }: { params: Promise<{ orgSlug: string }> }) {
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

  const { data: companies } = await supabase
    .from("companies")
    .select("id, legal_name, operating_name, incorporation_statute")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: true });

  return (
    <>
      <h1 className={styles.title}>{organization.name}</h1>

      <h2 className={styles.sectionTitle}>Companies</h2>
      {companies && companies.length > 0 ? (
        <ul className={styles.companyList}>
          {companies.map((company) => (
            <li key={company.id} className={styles.companyCard}>
              <p className={styles.companyName}>{company.operating_name ?? company.legal_name}</p>
              <p className={styles.companyMeta}>
                {INCORPORATION_STATUTE_LABELS[company.incorporation_statute] ??
                  company.incorporation_statute}
              </p>
              <Link
                href={`/app/${orgSlug}/companies/${company.id}/scenarios`}
                className={styles.link}
              >
                Scenarios
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.companyMeta}>No company on file yet.</p>
      )}
      <Link href={`/onboarding/${orgSlug}/company`} className={styles.link}>
        Add another company
      </Link>

      <p className={styles.notice}>
        Financing targets, dilution-versus-ceiling tracking, and documents/tasks awaiting review are
        not shown here yet — those depend on financing, governance, and document modules this
        product does not have built yet. This dashboard shows only what is real today.
      </p>
    </>
  );
}
