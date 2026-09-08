import axe from "axe-core";

/**
 * Runs axe-core against a rendered container and throws a readable error
 * listing every violation if any are found. Used by every `*.a11y.test.tsx`
 * file — collectively, this is this package's "Storybook + axe checks
 * wired into CI" gate (see scripts/ci/run-axe.sh and packages/ui's
 * `test:axe` script), run directly against React Testing Library output
 * rather than a built Storybook, which keeps the accessibility gate fast
 * and independent of any browser/static-server chain.
 */
export async function expectNoA11yViolations(container: Element): Promise<void> {
  const results = await axe.run(container);
  if (results.violations.length > 0) {
    const details = results.violations
      .map((violation) => {
        const targets = violation.nodes.map((node) => node.target.join(" ")).join("\n    ");
        return `${violation.id} (${violation.impact ?? "unknown"}): ${violation.help}\n    ${targets}`;
      })
      .join("\n\n");
    throw new Error(`Accessibility violations found:\n\n${details}`);
  }
}
