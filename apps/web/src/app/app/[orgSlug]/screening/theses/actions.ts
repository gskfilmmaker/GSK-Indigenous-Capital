"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/server";
import { createInvestorThesisCommand } from "../../../../../server/commands/createInvestorThesis";
import { percentPointsToFraction } from "../../../../../lib/scenario/percentInput";

export interface ThesisActionState {
  error?: string;
}

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function createThesisAction(
  _prevState: ThesisActionState,
  formData: FormData,
): Promise<ThesisActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const orgSlug = readString(formData, "orgSlug");
  const { data: organization } = await supabase
    .from("organizations")
    .select("id, slug")
    .eq("slug", orgSlug)
    .single();
  if (!organization) {
    return { error: "That organization could not be found." };
  }

  let criteria: unknown;
  try {
    criteria = JSON.parse(readString(formData, "criteriaJson") || "[]");
  } catch {
    return { error: "That criteria list couldn't be read — try re-adding the rows." };
  }

  const includeFundContext = formData.get("includeFundContext") === "on";
  const fundContext = includeFundContext
    ? {
        fundSize: { amount: readString(formData, "fundSizeAmount"), currency: "CAD" as const },
        targetAnnualReturn: percentPointsToFraction(readString(formData, "targetAnnualReturnPoints")),
        targetHoldYears: readString(formData, "targetHoldYears"),
      }
    : undefined;

  const result = await createInvestorThesisCommand(
    supabase,
    organization.id,
    user.id,
    {
      name: readString(formData, "name"),
      criteria,
      ...(fundContext ? { fundContext } : {}),
    },
    readString(formData, "idempotencyKey"),
  );

  if (!result.success) {
    return { error: result.error };
  }

  redirect(`/app/${organization.slug}/screening`);
}
