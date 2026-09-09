import { DisclaimerBanner, StepIndicator } from "@gsk/ui";
import Link from "next/link";
import styles from "./page.module.css";

const MODEL_REVIEW_RECORD_STEPS = [
  { id: "model", label: "Model" },
  { id: "review", label: "Review" },
  { id: "record", label: "Record" },
];

const STEP_DETAILS = [
  {
    id: "model",
    title: "Model",
    body: "Enter SAFE terms and see indicative ownership and dilution update live, at full precision — before anything is final.",
  },
  {
    id: "review",
    title: "Review",
    body: "Organize the financing details your lawyer and accountant need, in one place, ready for their professional review.",
  },
  {
    id: "record",
    title: "Record",
    body: "Keep an immutable record of what was modelled, when, and under which assumptions — for your own files and for counsel.",
  },
];

/**
 * Public landing page (spec §6.1). Explains the outcome, not legal
 * certainty — no "legally compliant," "lawyer replacement," "guaranteed
 * closing," or "official YC calculator" language, and no stereotyped
 * pan-Indigenous imagery (spec §6.1, §12): this page uses only the neutral
 * typographic design system in packages/ui, no decorative cultural motifs.
 */
export default function HomePage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.wordmark}>GSK Indigenous Capital — SAFE Studio</span>
        <nav className={styles.headerNav} aria-label="Account">
          <Link href="/scenario-studio" className={styles.headerLink}>
            Open Scenario Studio
          </Link>
          <Link href="/login" className={styles.headerLink}>
            Sign in
          </Link>
        </nav>
      </header>

      <section className={styles.hero}>
        <p className={styles.eyebrow}>Ontario-first · CAD-first</p>
        <h1 className={styles.headline}>
          Model dilution. Organize the financing. Prepare for professional review.
        </h1>
        <p className={styles.subhead}>
          SAFE Studio is a Canadian SAFE modelling and financing workflow for Indigenous founders
          and Canadian startups. It helps you understand dilution and organize your paperwork — it
          is not a substitute for your own lawyer or accountant.
        </p>
        <div className={styles.ctaRow}>
          <Link href="/scenario-studio" className={styles.primaryCta}>
            Model a SAFE scenario
          </Link>
          <p className={styles.scopeNote}>No account needed to try it. Nothing is saved yet.</p>
        </div>
        <DisclaimerBanner />
      </section>

      <section className={styles.section} aria-labelledby="how-it-works-heading">
        <h2 id="how-it-works-heading" className={styles.sectionTitle}>
          How it works
        </h2>
        <StepIndicator steps={MODEL_REVIEW_RECORD_STEPS} currentStepId="model" />
        <div className={styles.stepGrid}>
          {STEP_DETAILS.map((step) => (
            <div key={step.id} className={styles.stepCard}>
              <h3 className={styles.stepCardTitle}>{step.title}</h3>
              <p className={styles.stepCardBody}>{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className={styles.footer}>
        <DisclaimerBanner>
          SAFE Studio does not choose a securities exemption, decide who is eligible to invest, or
          replace your lawyer or accountant. It is not the same product as, and is not affiliated
          with, any other SAFE calculator.
        </DisclaimerBanner>
        <p className={styles.footerNote}>
          Currently supports post-money-cap, discount-only, and MFN SAFEs modelled before a priced
          round, in CAD. Priced-round conversion modelling is not yet available.
        </p>
      </footer>
    </div>
  );
}
