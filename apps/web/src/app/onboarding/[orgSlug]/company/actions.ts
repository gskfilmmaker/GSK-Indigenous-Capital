"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";
import { createCompanyCommand } from "../../../../server/commands/createCompany";

export interface CompanyOnboardingActionState {
  error?: string;
}

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readOptionalString(formData: FormData, key: string): string | undefined {
  const value = readString(formData, key).trim();
  return value === "" ? undefined : value;
}

export async function createCompanyAction(
  _prevState: CompanyOnboardingActionState,
  formData: FormData,
): Promise<CompanyOnboardingActionState> {
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

  function readAddress(prefix: string) {
    const address = {
      line1: readOptionalString(formData, `${prefix}Line1`),
      line2: readOptionalString(formData, `${prefix}Line2`),
      city: readOptionalString(formData, `${prefix}City`),
      provinceOrTerritory: readOptionalString(formData, `${prefix}ProvinceOrTerritory`),
      postalCode: readOptionalString(formData, `${prefix}PostalCode`),
      country: readOptionalString(formData, `${prefix}Country`),
    };
    return Object.values(address).some((value) => value !== undefined) ? address : undefined;
  }

  const registeredAddress = readAddress("registered");
  const headOfficeAddress =
    formData.get("sameAsRegistered") === "on" ? registeredAddress : readAddress("headOffice");

  const result = await createCompanyCommand(
    supabase,
    organization.id,
    user.id,
    {
      legalName: readString(formData, "legalName"),
      operatingName: readOptionalString(formData, "operatingName"),
      incorporationStatute: readString(formData, "incorporationStatute") || undefined,
      incorporationStatuteOther: readOptionalString(formData, "incorporationStatuteOther"),
      corporationNumber: readOptionalString(formData, "corporationNumber"),
      incorporationDate: readOptionalString(formData, "incorporationDate"),
      registeredAddress,
      headOfficeAddress,
      hasShareholderAgreement: formData.get("hasShareholderAgreement") === "on",
      hasUnanimousShareholderAgreement: formData.get("hasUnanimousShareholderAgreement") === "on",
      hasInvestorRightsAgreement: formData.get("hasInvestorRightsAgreement") === "on",
      hasDebtCovenant: formData.get("hasDebtCovenant") === "on",
      hasReservedMatters: formData.get("hasReservedMatters") === "on",
    },
    readString(formData, "idempotencyKey"),
  );

  if (!result.success) {
    return { error: result.error };
  }

  redirect(`/app/${organization.slug}/dashboard`);
}
