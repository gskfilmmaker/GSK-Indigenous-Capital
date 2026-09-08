import type { Preview } from "@storybook/react";
import "../src/tokens/tokens.css";

/**
 * axe-core is wired in via @storybook/addon-a11y for interactive
 * browsing/review here. The CI-enforced accessibility gate is this
 * package's `test:axe` vitest suite (src/**\/*.a11y.test.tsx), which runs
 * axe-core directly against React Testing Library output — see
 * src/a11y/expectNoA11yViolations.ts and scripts/ci/run-axe.sh at the repo
 * root for why the CI gate doesn't depend on a built Storybook.
 */
const preview: Preview = {
  parameters: {
    controls: { expanded: true },
    backgrounds: {
      default: "paper",
      values: [
        { name: "paper", value: "#f3f4ef" },
        { name: "dark", value: "#121815" },
      ],
    },
  },
};

export default preview;
