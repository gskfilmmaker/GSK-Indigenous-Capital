// Deliberately browser-safe (see packages/cap-table/src/index.ts for the
// identical reasoning): `./canonical.js` needs `node:crypto` via
// `@gsk/audit`'s `sha256Hex`, a Node-only, persistence/snapshot-hashing
// concern, not something every consumer of the base schemas/ids needs.
// It's exported separately via the "@gsk/domain/hashing" subpath instead
// (see package.json "exports"), so importing plain `@gsk/domain` — as
// apps/web's client-side Scenario Studio does, for `parseScenario`/id
// generation — never pulls in a Node built-in a browser bundle can't
// resolve.
export * from "./ids.js";
export * from "./decimal.js";
export * from "./money.js";
export * from "./scenario.js";
