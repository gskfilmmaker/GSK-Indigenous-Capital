/**
 * Durable background job entrypoint (spec §17).
 *
 * Step 1 placeholder: job functions (scenario run, snapshot/export
 * generation, document rendering, reminders, bank CSV matching, audit-chain
 * anchoring, retention processing) are added starting in Step 4, wired to
 * the Inngest provider selected in docs/adr/0004-background-job-provider.md.
 */

export function workerPlaceholder(): string {
  return "worker not yet implemented";
}
