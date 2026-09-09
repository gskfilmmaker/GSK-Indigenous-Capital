import { parseScenario, type ScenarioId } from "@gsk/domain";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "../../../../../../../lib/supabase/server";
import { hydrateFormStateFromScenario } from "../../../../../../../lib/scenario/buildScenario";
import { PersistedScenarioStudio } from "./PersistedScenarioStudio";

export const metadata: Metadata = {
  title: "Scenario — GSK Indigenous Capital",
};

export default async function ScenarioDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; companyId: string; scenarioId: string }>;
}) {
  const { orgSlug, companyId, scenarioId } = await params;
  const supabase = await createClient();

  const { data: organization } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .single();
  if (!organization) {
    notFound();
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id, organization_id")
    .eq("id", companyId)
    .single();
  if (!company || company.organization_id !== organization.id) {
    notFound();
  }

  const { data: scenario } = await supabase
    .from("scenarios")
    .select("id, company_id, name")
    .eq("id", scenarioId)
    .maybeSingle();

  if (scenario && scenario.company_id !== companyId) {
    notFound();
  }

  if (!scenario) {
    // A fresh id from the "+ New scenario" link — nothing saved yet.
    return (
      <PersistedScenarioStudio
        organizationId={organization.id}
        companyId={companyId}
        scenarioId={scenarioId as ScenarioId}
        initialName="Untitled scenario"
      />
    );
  }

  const { data: latestVersion } = await supabase
    .from("scenario_versions")
    .select("version_number, input")
    .eq("scenario_id", scenarioId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestVersion) {
    // Should not happen (save_scenario always writes a version with the
    // scenario) — fail safe to a blank editor rather than crashing.
    return (
      <PersistedScenarioStudio
        organizationId={organization.id}
        companyId={companyId}
        scenarioId={scenarioId as ScenarioId}
        initialName={scenario.name}
      />
    );
  }

  const parsedInput = parseScenario(latestVersion.input);
  if (!parsedInput.success) {
    // The persisted input was written by this same app's own validated
    // save path, so this should be unreachable — fail safe rather than
    // crash the page if it ever isn't.
    return (
      <PersistedScenarioStudio
        organizationId={organization.id}
        companyId={companyId}
        scenarioId={scenarioId as ScenarioId}
        initialName={scenario.name}
        initialSavedVersionNumber={latestVersion.version_number}
      />
    );
  }

  const { existingCapitalization, safeRows } = hydrateFormStateFromScenario(parsedInput.data);

  return (
    <PersistedScenarioStudio
      organizationId={organization.id}
      companyId={companyId}
      scenarioId={scenarioId as ScenarioId}
      initialName={scenario.name}
      initialExistingCapitalization={existingCapitalization}
      initialSafeRows={safeRows}
      initialSavedVersionNumber={latestVersion.version_number}
    />
  );
}
