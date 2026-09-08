/**
 * This barrel does NOT import `./tokens/tokens.css` as a side effect.
 * Next.js only allows global (non-module) CSS to be imported from the root
 * layout/custom App — every other component in this package uses CSS
 * Modules (`*.module.css`), which Next.js allows anywhere, but the design
 * tokens are genuine global `:root` custom properties and must be imported
 * exactly once, by the consuming app's root layout:
 *
 *   import "@gsk/ui/tokens.css";
 *
 * (see apps/web's root layout once this package is wired in, Step 4).
 */
export * from "./format/decimal.js";
export * from "./a11y/expectNoA11yViolations.js";

export * from "./components/DataTable/DataTable.js";
export * from "./components/NumberField/NumberField.js";
export * from "./components/OwnershipBar/OwnershipBar.js";
export * from "./components/DilutionBridge/DilutionBridge.js";
export * from "./components/StateBadge/StateBadge.js";
export * from "./components/StateBadge/states.js";
export * from "./components/WatermarkOverlay/WatermarkOverlay.js";
export * from "./components/DisclaimerBanner/DisclaimerBanner.js";
export * from "./components/StepIndicator/StepIndicator.js";
