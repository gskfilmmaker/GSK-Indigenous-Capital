import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signOutAction } from "../(auth)/actions";
import { createClient } from "../../lib/supabase/server";
import styles from "./account.module.css";

export const metadata: Metadata = {
  title: "Account — GSK Indigenous Capital",
};

/**
 * Minimal authenticated placeholder proving the sign-in → session →
 * RLS-scoped-request loop works end to end. Task #42 (authenticated app
 * shell + org onboarding) replaces this with the real app shell — this
 * page intentionally does nothing beyond that verification.
 *
 * `getUser()`, not `getSession()`: it re-validates the JWT against
 * Supabase Auth on every call rather than trusting a possibly-stale
 * cookie, which matters on a page that gates access.
 */
export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Signed in</h1>
      <p className={styles.email}>{user.email}</p>
      <form action={signOutAction}>
        <button type="submit" className={styles.signOut}>
          Sign out
        </button>
      </form>
    </main>
  );
}
