import { newScenarioId } from "@gsk/domain";
import { StateBadge, type ScenarioState } from "@gsk/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "../../../../../../lib/supabase/server";
import styles from "./scenarios.module.css";

export const metadata: Metadata = {
  title: "Scenarios — GSK Indigenous Capital",
};

export default async function ScenarioListPage({
  params,
}: {
  params: Promise<{ orgSlug: string; companyId: string }>;
}) {
  const { orgSlug, companyId } = await params;
  const supabase = await createClient();

  const { data: company } = await supabase
    .from("companies")
    .select("id, legal_name, operating_name")
    .eq("id", companyId)
    .single();

  if (!company) {
    notFound();
  }

  const { data: scenarios } = await supabase
    .from("scenarios")
    .select("id, name, status, updated_at")
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false });

  return (
    <>
      <h1 className={styles.title}>Scenarios</h1>
      <p className={styles.subtitle}>{company.operating_name ?? company.legal_name}</p>

      <Link
        href={`/app/${orgSlug}/companies/${companyId}/scenarios/${newScenarioId()}`}
        className={styles.newLink}
      >
        + New scenario
      </Link>

      {scenarios && scenarios.length > 0 ? (
        <ul className={styles.list}>
          {scenarios.map((scenario) => (
            <li key={scenario.id}>
              <Link
                href={`/app/${orgSlug}/companies/${companyId}/scenarios/${scenario.id}`}
                className={styles.card}
              >
                <div className={styles.cardHeader}>
                  <span className={styles.cardName}>{scenario.name}</span>
                  <StateBadge kind="scenario" state={scenario.status as ScenarioState} />
                </div>
                <p className={styles.cardMeta}>
                  Last saved {new Date(scenario.updated_at).toLocaleString("en-CA")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.emptyState}>No scenarios yet.</p>
      )}
    </>
  );
}
