// This barrel is deliberately browser-safe: nothing here pulls in Node's
// `node:crypto` (or any other Node-only built-in), so it can be imported
// directly by client-side UI code (apps/web's Scenario Studio runs the
// engine live in the browser — there is nowhere else to run it, with no
// live database yet to compute against server-side). `./result.js`'s
// snapshot-hashing helpers need `node:crypto` (via `@gsk/audit`'s
// `sha256Hex`) — a Node-only, server-side/persistence concern unrelated to
// pure calculation — so they are exported separately via the
// "@gsk/cap-table/hashing" subpath (see package.json "exports") instead of
// from here, where pulling them in would break a client bundle even for
// code that never calls them.
export * from "./decimal.js";
export * from "./errors.js";
export * from "./capSafeOwnership.js";
export * from "./existingCapitalization.js";
export * from "./mfnCandidates.js";
export * from "./poolTopUp.js";
export * from "./runScenario.js";
