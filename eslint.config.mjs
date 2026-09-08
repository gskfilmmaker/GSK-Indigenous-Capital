// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import jsxA11y from "eslint-plugin-jsx-a11y";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/playwright-report/**",
      "**/test-results/**",
      "**/storybook-static/**",
      "**/node_modules/**",
      "**/*.tsbuildinfo",
      // The flat config file itself: type-aware linting of the config
      // objects it imports produces false-positive unsafe-* errors, and
      // it is tooling, not application code.
      "eslint.config.mjs",
      // Next.js-generated; "This file should not be edited" per its own
      // header, and its content is rewritten by `next build`/`next dev`.
      "**/next-env.d.ts",
      // Plain Node build-tooling scripts (e.g. packages/ui/scripts/copy-
      // css.mjs) aren't covered by any package's tsconfig.json "include"
      // (they're .mjs, not .ts/.tsx app source), so typed linting via
      // projectService can't resolve a project for them — same "tooling,
      // not application code" reasoning as this config file's own
      // self-exclusion above.
      "**/scripts/**/*.mjs",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "jsx-a11y": jsxA11y,
    },
    rules: {
      ...jsxA11y.configs.recommended.rules,
      // Root CLAUDE.md invariant 2: never use JS floating point for money,
      // shares, prices, ratios, ownership, or FX. This is enforced by code
      // review + the cap-table package boundary (no framework imports), not
      // a lint rule alone — see packages/cap-table/CLAUDE.md.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    files: ["**/*.config.{js,mjs,cjs,ts}", "**/*.setup.{js,ts}"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
    },
  },
  eslintConfigPrettier,
);
