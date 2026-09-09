"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import { createOrganizationCommand } from "../../server/commands/createOrganization";
import { slugify } from "@gsk/domain";

export interface OnboardingActionState {
  error?: string;
}

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function createOrganizationAction(
  _prevState: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const name = readString(formData, "name").trim();
  const slugInput = readString(formData, "slug").trim();
  const slug = slugInput || slugify(name);

  const result = await createOrganizationCommand(supabase, { name, slug });
  if (!result.success) {
    return { error: result.error };
  }

  redirect(`/onboarding/${result.slug}/company`);
}
