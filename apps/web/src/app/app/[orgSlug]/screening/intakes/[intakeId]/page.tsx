import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ThesisCriterion } from "@gsk/domain";
import { createClient } from "../../../../../../lib/supabase/server";
import { RunScreeningPanel } from "./RunScreeningPanel";
import { ScreeningResultView } from "./ScreeningResultView";
import styles from "../../screening.module.css";

export const metadata: Metadata = {
  title: "Startup intake — GSK Indigenous Capital",
};

const STAGE_LABELS: Record<string, string> = {
  pre_seed: "Pre-seed",
  seed: "Seed",
  series_a: "Series A",
  growth: "Growth",
};

export default async function IntakeDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; intakeId: string }>;
}) {
  const { orgSlug, intakeId } = await params;
  const supabase = await createClient();

  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("slug", orgSlug)
    .single();
  if (!organization) {
    notFound();
  }

  const { data: intake } = await supabase
    .from("startup_intakes")
    .select("id, company_name, industry, stage, intake_data, updated_at")
    .eq("id", intakeId)
    .single();
  if (!intake) {
    notFound();
  }

  const [{ data: theses }, { data: snapshots }] = await Promise.all([
    supabase
      .from("investor_theses")
      .select("id, name, criteria, fund_context")
      .eq("organization_id", organization.id)
      .order("name", { ascending: true }),
    supabase
      .from("screening_snapshots")
      .select("id, output, created_at")
      .eq("startup_intake_id", intakeId)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const latestSnapshot = snapshots?.[0];
  const thesisOptions = (theses ?? []).map((thesis) => ({
    id: thesis.id,
    name: thesis.name,
    criteria: (thesis.criteria as ThesisCriterion[] | null) ?? [],
    fundContext: thesis.fund_context as
      | { fundSize: { amount: string }; targetAnnualReturn: string; targetHoldYears: string }
      | null,
  }));

  return (
    <>
      <h1 className={styles.title}>{intake.company_name}</h1>
      <p className={styles.subtitle}>
        {intake.industry} · {STAGE_LABELS[intake.stage] ?? intake.stage} · last updated{" "}
        {new Date(intake.updated_at).toLocaleString("en-CA")}
      </p>

      <h2 className={styles.sectionTitle}>Run screening</h2>
      <RunScreeningPanel
        organizationId={organization.id}
        intakeId={intake.id}
        intakeData={intake.intake_data}
        theses={thesisOptions}
      />

      <h2 className={styles.sectionTitle}>Latest result</h2>
      {latestSnapshot ? (
        <>
          <p className={styles.cardMeta}>
            Computed {new Date(latestSnapshot.created_at).toLocaleString("en-CA")}
          </p>
          <ScreeningResultView output={latestSnapshot.output as Record<string, unknown>} />
        </>
      ) : (
        <p className={styles.emptyState}>
          No screening has been run yet — pick a thesis (optional) above and click Run screening.
        </p>
      )}
    </>
  );
}
