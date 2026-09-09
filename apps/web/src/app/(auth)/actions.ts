"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import { getAppUrl } from "../../lib/supabase/env";

export interface AuthActionState {
  error?: string;
}

const EMAIL_PASSWORD_REQUIRED = "Enter your email and password.";
const MIN_PASSWORD_LENGTH = 8;

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readTrimmed(formData: FormData, key: string): string {
  return readString(formData, key).trim();
}

export async function signInAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = readTrimmed(formData, "email");
  const password = readString(formData, "password");

  if (!email || !password) {
    return { error: EMAIL_PASSWORD_REQUIRED };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect("/account");
}

export async function signUpAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = readTrimmed(formData, "email");
  const password = readString(formData, "password");
  const confirmPassword = readString(formData, "confirmPassword");

  if (!email || !password) {
    return { error: EMAIL_PASSWORD_REQUIRED };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getAppUrl()}/auth/confirm?next=/account`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/signup/check-email");
}

export async function requestPasswordResetAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = readTrimmed(formData, "email");

  if (!email) {
    return { error: "Enter your email." };
  }

  const supabase = await createClient();
  // Supabase itself does not report whether the email belongs to an
  // existing account — it returns success either way, which already
  // prevents this form from being used to enumerate registered emails. A
  // returned error here is therefore a genuine send failure (rate limit,
  // misconfiguration), not "no such account", so it's safe to surface.
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getAppUrl()}/auth/confirm?next=/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/forgot-password/check-email");
}

export async function updatePasswordAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const password = readString(formData, "password");
  const confirmPassword = readString(formData, "confirmPassword");

  if (!password) {
    return { error: "Enter a new password." };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  redirect("/account");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
