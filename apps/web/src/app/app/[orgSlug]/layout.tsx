import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { signOutAction } from "../../(auth)/actions";
import { createClient } from "../../../lib/supabase/server";
import styles from "./shell.module.css";

/**
 * Authenticated app shell (spec route `/app/:orgSlug/...`). Membership
 * is enforced twice: RLS is the real boundary (root CLAUDE.md invariant
 * 1) — an organization this user cannot see simply returns no row here
 * — and `notFound()` turns that into an honest 404 rather than a
 * confusing blank/broken page.
 */
export default async function AppShellLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", orgSlug)
    .single();

  if (!organization) {
    notFound();
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/" className={styles.wordmark}>
            GSK Indigenous Capital
          </Link>
          <span className={styles.orgName}>{organization.name}</span>
        </div>
        <div className={styles.headerRight}>
          <Link href={`/app/${organization.slug}/dashboard`} className={styles.headerLink}>
            Dashboard
          </Link>
          <Link href="/scenario-studio" className={styles.headerLink}>
            Scenario Studio
          </Link>
          <form action={signOutAction}>
            <button type="submit" className={styles.signOut}>
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
