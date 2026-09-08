# GSK Indigenous Capital — SAFE Studio

## Claude Code Master Product, Legal-Workflow, UX, Data, Architecture, and Implementation Specification

**Working product name:** GSK Indigenous Capital — SAFE Studio  
**Requested concept:** A GSK-owned, Indigenous-founder-centred Canadian alternative to the YC SAFE calculator and “Send a SAFE” workflow  
**Specification date:** 2026-09-08  
**Primary launch jurisdiction:** Ontario, Canada  
**Primary currency:** CAD  
**Build status:** Specification only; no production legal instrument is approved by this document  
**Source conversation:** `https://chatgpt.com/g/g-p-694c8c5f05f88191827cb9fbb7808c7e-start-up-funding/c/6a9fd9ce-55b4-83e9-a790-986bac461394`

---

## 0. Instructions to Claude Code

Build this product as a production-grade, multi-tenant web application. Do not create a cosmetic calculator demo and do not copy Y Combinator’s source code, design, text, trade dress, URL format, or trademarks. Implement the published post-money SAFE economics independently and validate them against the golden tests in this document.

Use the phased implementation plan. At the end of every phase:

1. run formatting, linting, type checking, unit tests, database tests, accessibility tests, and relevant end-to-end tests;
2. show the files changed and migrations added;
3. list assumptions, unsupported cases, security concerns, and remaining work;
4. do not merge, deploy, publish a legal template, send a document, or enable signatures without explicit authorization;
5. never bypass row-level security, use JavaScript floating point for financial calculations, edit immutable snapshots, or make legal eligibility decisions.

Create a root `CLAUDE.md` containing the non-negotiable engineering rules in §24. Create focused `CLAUDE.md` files inside the calculation and document-generation packages.

---

## 1. Product decision and naming rule

The platform is Indigenous-founder-centred, but the legal instrument is not a special “Indigenous SAFE.” The underlying contract remains the applicable Canadian post-money SAFE or another counsel-authored Canadian financing instrument.

Recommended public architecture:

- **Company/umbrella brand:** GSK Indigenous Capital
- **Product/module:** SAFE Studio
- **Plain-language descriptor:** Canadian SAFE modelling and financing workflow for Indigenous founders and Canadian startups

Do not place “Indigenous SAFE” in generated legal documents or imply that Indigenous identity creates a securities exemption, valuation rule, tax result, or unique contract. Indigenous identity fields must be optional and collected only for a disclosed feature. First Nations OCAP® must not be presented as a pan-Indigenous standard for First Nations, Inuit, and Métis data.[^1](https://fnigc.ca/ocap-training)

---

## 2. Product vision

Create a secure, understandable system that helps a Canadian founder move from financing idea to an organized, lawyer-reviewed closing record:

1. learn how post-money SAFEs work;
2. model one or many SAFE investments;
3. understand founder, option-pool, SAFE-investor, and new-money dilution;
4. compare financing scenarios;
5. freeze and share a read-only calculation snapshot;
6. prepare structured company and investor intake;
7. generate calculation reports and, only after counsel approval, legal-document drafts;
8. record board approval evidence;
9. record signatures and delivery evidence;
10. reconcile investment funds;
11. track exemption evidence, regulatory filing deadlines, corporate records, and conversion tasks;
12. preserve an exportable audit bundle.

The application is a calculation, education, document-preparation, and workflow system. It is not a law firm, securities dealer, finder, investor recommender, tax advisor, or autonomous legal service.

---

## 3. Source requirements extracted from the linked conversation

The linked report establishes the following requirements and example economics:

- A post-money SAFE is a contractual right to future equity. It is not debt, carries no interest, has no maturity date, and normally converts during a priced equity financing.
- Indicative cap ownership before a priced round is `purchase amount ÷ post-money valuation cap`.
- `1,200,000 ÷ 8,000,000 = 15%`.
- `100,000 ÷ 20,000,000 = 0.5%`.
- Those two post-money cap SAFEs sell an indicative combined 15.5% before priced-round and option-pool dilution.
- CAD 250,000 for 20% implies CAD 1.25 million post-money and CAD 1.0 million pre-money.
- Founder-protective comparison cases for CAD 250,000:
  - 10% at CAD 2.5 million post-money cap;
  - 12.5% at CAD 2.0 million cap;
  - 15% at CAD 1,666,667 cap;
  - 20% at CAD 1.25 million cap.
- If existing holders retain 80% after a SAFE layer and a later priced round sells 20%, existing holders become 64%, the SAFE investor becomes 16%, and new investors hold 20%, before any option-pool adjustment.
- The app must model multiple SAFEs, option pools, and priced rounds and must produce a shareable calculation.
- Canadian users need a Canadian form and Canadian corporate/securities-law review. YC’s online “Send a SAFE” workflow is described as US-incorporation-focused; do not make the GSK product depend on it.
- Currency must always be explicit. Use `CAD`, not an ambiguous `$`.
- Pro rata rights are separate, optional, and must not be silently granted.
- The original report’s HYDRIX-specific red lines become configurable issue-spotting prompts, not universal legal conclusions: no IP transfer, blanket exclusivity, operational veto for a small cheque, guaranteed return, disguised redemption obligation, or hidden superior side-letter economics.

The report also flags that the claim “90% of pre-seed rounds use SAFE” is unverified. Do not use that statistic in product marketing.

---

## 4. Users and roles

### 4.1 Primary users

1. **Founder/Owner** — creates the organization, issuer, cap table, financing, scenarios, and team.
2. **Organization Admin** — manages members and settings but cannot silently override legal/finance controls.
3. **Editor/Finance Operator** — enters stakeholders, securities, scenarios, expected payments, and imports bank CSV files.
4. **Canadian Counsel** — reviews templates, jurisdiction, exemptions, document variables, board package, and closing record.
5. **Finance Approver** — validates calculations, opening cap table, wire matches, and accounting exports.
6. **Viewer/Advisor** — read-only workspace access.
7. **Investor Portal User** — access only to specifically shared documents, representations, signing tasks, and receipts; not a tenant member by default.
8. **Platform Administrator** — operates service health and controlled configuration with no standing access to tenant data.

### 4.2 Capability model

Use capabilities, not scattered role-name checks. Minimum capabilities:

- `org.read`, `org.manage`, `member.invite`, `member.role.change`
- `company.read`, `company.write`
- `stakeholder.read`, `stakeholder.write`, `stakeholder.sensitive.read`
- `ledger.read`, `ledger.draft`, `ledger.post`, `ledger.reverse`
- `scenario.read`, `scenario.write`, `scenario.run`, `snapshot.freeze`, `snapshot.share`
- `template.read`, `template.review`, `template.publish`
- `document.request`, `document.final.generate`, `document.executed.upload`
- `board.manage`, `board.approval.record`
- `investment.manage`, `payment.import`, `payment.match.propose`, `payment.match.approve`
- `compliance.read`, `compliance.review`, `filing.receipt.record`
- `audit.export`, `sensitive.export`
- `support.grant`, `platform.configure`

Owner/admin/legal/finance roles require MFA. Step-up authentication is required for role changes, final document generation, template publication, wire approval, sensitive exports, and support access.

---

## 5. Information architecture and routes

```text
/
/about
/how-it-works
/education/safe-basics
/education/dilution
/education/canadian-process
/privacy
/terms
/accessibility

/auth/sign-in
/auth/callback
/onboarding

/app/:orgSlug
/app/:orgSlug/dashboard
/app/:orgSlug/companies
/app/:orgSlug/companies/:companyId/overview
/app/:orgSlug/companies/:companyId/cap-table
/app/:orgSlug/companies/:companyId/stakeholders
/app/:orgSlug/companies/:companyId/securities
/app/:orgSlug/companies/:companyId/options
/app/:orgSlug/companies/:companyId/financings
/app/:orgSlug/companies/:companyId/scenarios
/app/:orgSlug/companies/:companyId/scenarios/:scenarioId
/app/:orgSlug/companies/:companyId/scenarios/:scenarioId/compare
/app/:orgSlug/companies/:companyId/investors
/app/:orgSlug/companies/:companyId/documents
/app/:orgSlug/companies/:companyId/governance
/app/:orgSlug/companies/:companyId/payments
/app/:orgSlug/companies/:companyId/compliance
/app/:orgSlug/companies/:companyId/audit
/app/:orgSlug/settings/members
/app/:orgSlug/settings/security
/app/:orgSlug/settings/privacy
/app/:orgSlug/settings/integrations

/s/:shareToken
/investor/:portalToken
/admin/templates
/admin/engine-releases
/admin/jurisdictions
/admin/feature-flags
/admin/jobs
```

---

## 6. Core screens and UX requirements

### 6.1 Public landing page

Explain the outcome, not legal certainty:

- “Model dilution. Organize the financing. Prepare for professional review.”
- Show a three-step diagram: Model → Review → Record.
- State Ontario-first and CAD-first scope.
- Prominently state that the platform is not legal, tax, accounting, or investment advice.
- Avoid claims such as “legally compliant,” “lawyer replacement,” “guaranteed closing,” or “official YC calculator.”
- Indigenous-centred design must be co-designed and not rely on stereotyped pan-Indigenous imagery.

### 6.2 Onboarding

Collect only:

- organization name and slug;
- user locale and time zone;
- issuer legal name and optional operating name;
- incorporation statute/jurisdiction: OBCA, CBCA, other/unknown;
- corporation number and incorporation date;
- registered/head-office addresses;
- default currency, initially CAD;
- existing shareholder agreement, unanimous shareholder agreement, investor-rights agreement, debt covenant, or reserved-matter flags;
- team invitations.

If statute or governing documents are unknown, allow onboarding but block final legal-document workflow.

Optional Indigenous/community context:

- no Indigenous identity data is required for ordinary SAFE modelling;
- optional self-identification only when needed for a disclosed program/resource feature;
- a separate “community/Nation data” flag activates protocol and data-governance review before data ingestion or sharing.

### 6.3 Dashboard

Cards:

- issuer and cap-table status;
- current financing target, amount committed, amount funded;
- modelled dilution versus approved ceiling;
- unresolved data/counsel/board/filing tasks;
- documents awaiting review;
- expected or unmatched payments;
- upcoming deadlines;
- recent immutable activity.

Never label a financing “compliant.” Use states such as `Draft`, `Needs data`, `Needs counsel review`, `Counsel review recorded`, `Board evidence missing`, `Ready for authorized signing`, `Executed copy uploaded`, `Funding pending`, `Funded`, `Filing evidence pending`, and `Closed record complete`.

### 6.4 Cap-table workspace

Two modes:

1. **Simple percentage estimator** — educational, fast, and clearly marked non-execution-ready.
2. **Detailed share ledger** — issued shares, classes, holders, options, promised options, unissued pool, convertibles, and as-of date.

Features:

- import CSV using a downloadable template;
- detect duplicates and totals that do not reconcile;
- require finance/authorized-person certification of opening balances;
- never store an editable “current percentage” as the source of truth;
- ownership is derived from posted ledger entries;
- posted entries cannot be edited or deleted; use reversing entries;
- accessible cap-table grid plus charts and plain-language narrative.

### 6.5 SAFE Scenario Studio

#### Layout

- left column: assumptions and editable financing events;
- center/right: live ownership/dilution visualization;
- lower panels: cap table today, conversion, priced round, formulas, warnings, comparison.

#### SAFE row fields

- stable row ID;
- chronological order and drag/keyboard reorder;
- investor display label (optional in public scenario);
- investment amount;
- currency;
- instrument type:
  - post-money valuation cap;
  - discount-only;
  - MFN;
- valuation cap for cap SAFE;
- discount percentage for discount SAFE;
- issue/sequence date;
- separate pro rata side-letter flag/status;
- notes and unsupported-term flag.

Type switching must clear or disable inapplicable fields and must not silently reuse stale values.

#### Existing capitalization fields

Simple mode:

- founders/legacy percentage;
- granted options percentage;
- existing unissued option-pool percentage.

Detailed mode:

- issued shares by class/holder;
- issued options;
- promised options;
- existing unissued option pool;
- other supported converting securities;
- capitalization-definition version.

#### Priced-round fields

- Series/round name;
- enabled/disabled;
- new money amount;
- currency;
- valuation mode: pre-money or post-money;
- valuation amount;
- target post-closing unissued option-pool percentage;
- new preferred class;
- optional per-investor pro rata purchase inputs;
- closing date/as-of date;
- advanced assumptions drawer.

#### Results

Always show:

- total indicative SAFE ownership;
- legacy/founder ownership;
- existing pool ownership;
- each SAFE’s ownership or “not determinable before a priced round”;
- aggregate dilution warning;
- assumption and formula version.

With priced round enabled, also show:

- per-SAFE conversion route and why it won;
- conversion price and shares;
- Standard Preferred versus SAFE/shadow Preferred modelling label;
- option-pool top-up;
- new-money shares and ownership;
- post-closing holdings by stakeholder and class;
- dilution bridge from current to post-SAFE to post-round;
- pro rata purchases where supported;
- calculation trace and convergence status.

Charts must have equivalent tables and narrative text. Never rely on colour alone.

### 6.6 Scenario comparison

Compare up to five frozen or draft scenarios:

- total capital raised;
- cap/discount/MFN mix;
- founder ownership after SAFE and after round;
- investor ownership;
- option-pool impact;
- valuation assumptions;
- effective dilution;
- warnings and unsupported cases;
- funded milestones and runway entered by user;
- optional founder-defined dilution ceiling.

Include example HYDRIX-style presets only as clearly labelled examples, not recommendations:

- CAD 250,000 at CAD 2.5M cap = 10%;
- CAD 250,000 at CAD 2.0M cap = 12.5%;
- CAD 250,000 at CAD 1.666667M cap ≈ 15%;
- CAD 250,000 at CAD 1.25M cap = 20%.

### 6.7 Shareable snapshot

- Freeze input, output, assumptions, engine version, schema version, and hashes.
- Generate a private, revocable, expiring, read-only link.
- Store only a token hash; reveal raw token once.
- Optional password, maximum views, download toggle, and expiry.
- Public URL must not include names, emails, signatures, or sensitive cap-table data by default.
- Display “Calculation snapshot — not a legal document.”
- Record access events with privacy-minimized IP/user-agent hashes and retention.
- Opening the link must reproduce identical unrounded results under the recorded engine version.

### 6.8 Investor and financing workspace

Investor record:

- person/entity/trust type;
- legal and display names;
- contact and address;
- residence/jurisdiction;
- proposed amount and currency;
- relationship owner/source;
- counsel-confirmed exemption category and statutory reference;
- verification method/evidence reference;
- representation and acknowledgement versions;
- pro rata side letter status;
- investment status;
- signed-document, funding, delivery, and filing-record status.

The system must never decide that an investor “qualifies,” is “eligible,” or is “approved.” Use “requires issuer/counsel confirmation.”

### 6.9 Document centre

Separate two products:

1. **Calculation reports** — PDF/CSV exports of scenario inputs, outputs, formulas, assumptions, timestamp, engine version, and disclaimer.
2. **Legal documents** — generated only from a published, counsel-reviewed template version and an immutable variable snapshot.

Document cards show:

- jurisdiction;
- document type;
- source/template version;
- source/template SHA-256;
- input snapshot hash;
- renderer version;
- counsel review state;
- board evidence state;
- draft/final watermark;
- generated artifacts and executed upload;
- delivery/signature state.

All legal previews/downloads must be watermarked `DRAFT — NOT FOR SIGNATURE` until counsel approves the exact template version and variable set and board approval evidence is recorded.

### 6.10 Governance workspace

Support:

- financing approval matter;
- board resolution/consent draft;
- exact instrument/template and investor schedule;
- conflicts disclosure;
- approver list and required order;
- meeting or unanimous written consent evidence;
- uploaded signed resolution;
- separate conversion approval matter later.

The app records approval evidence; MVP does not claim that clicking “Approve” is a legally effective board resolution.

### 6.11 Payments workspace

- expected payment per investment;
- unique reference code;
- funding instructions with tightly restricted access;
- manual CSV statement import for MVP;
- normalized transaction rows;
- exact-match rules first;
- fuzzy matches are proposals only;
- separate finance approval;
- split/many-to-many matching;
- exceptions and reversals;
- never mark funded from an unapproved fuzzy match.

### 6.12 Compliance workspace

For each issuance:

- issuer statute and jurisdiction;
- investor residence;
- counsel-confirmed exemption and paragraph;
- verification evidence checklist;
- distribution date;
- risk acknowledgement status;
- filing requirement/status;
- immutable 10-day or 30-day filing clock when configured;
- receipt/evidence upload;
- resale-restriction and dealer/finder issue flags;
- corporate-record completeness;
- post-close and future-conversion tasks.

The private-issuer workflow is a checklist and counsel gate, not an automated eligibility determination.

---

## 7. Calculation engine

### 7.1 Mathematical and implementation rules

- Use a pure, deterministic, versioned TypeScript package.
- Use arbitrary-precision decimal/rational arithmetic; never JS `number` for money, shares, prices, ratios, or percentages.
- PostgreSQL storage uses `numeric`, explicit ISO 4217 currency, and documented precision.
- Round only for display or at an approved legal share-allocation boundary.
- Preserve unrounded values in engine outputs.
- Reconcile displayed percentages to exactly 100.00% with a deterministic residual-allocation policy.
- Identical canonical inputs under the same engine version produce identical output hashes.
- Historical snapshots are never silently recalculated on a new engine.

### 7.2 Cap SAFE before priced round

For SAFE `i`:

```text
indicativeOwnership_i = purchaseAmount_i / postMoneyValuationCap_i
totalCapSafeOwnership = Σ indicativeOwnership_i
legacyOwnership = 1 - totalCapSafeOwnership
```

Multiple post-money cap SAFEs add and do not dilute one another at the pre-round cap-implied layer.

### 7.3 Detailed share-level capitalization

Let `B` be fully diluted capitalization before SAFE conversion, including:

- issued and outstanding shares;
- issued and outstanding options;
- promised options;
- existing unissued option pool;
- applicable supported converting securities.

Exclude new priced-round money and the financing-related pool increase except any amount needed to cover promised options beyond the existing pool.

If all relevant cap SAFEs use their cap routes:

```text
T = Σ(purchaseAmount_i / valuationCap_i)
companyCapitalization = B / (1 - T)
safeShares_i = indicativeOwnership_i × companyCapitalization
safePrice_i = valuationCap_i / companyCapitalization
safeShares_i = purchaseAmount_i / safePrice_i
```

### 7.4 Priced-round route comparison

For each SAFE, calculate every contractually applicable route and choose the route producing the greatest shares:

```text
capRouteShares = purchaseAmount / (valuationCap / companyCapitalization)
standardRoundShares = purchaseAmount / roundPrice
discountRouteShares = purchaseAmount / (roundPrice × (1 - discountPercent))
```

Round price:

```text
roundPrice = preMoneyValuation /
  (fullyDilutedSharesAfterSafeConversion + financingOptionPoolIncrease)
newMoneyShares = newMoney / roundPrice
```

Because SAFE conversion, round price, and pool top-up may be circular, solve algebraically when possible; otherwise use a bounded deterministic decimal solver with tolerance, iteration limit, and visible failure state. Never emit NaN, Infinity, an arbitrary branch, or a stale denominator.

### 7.5 Option-pool behaviour

- Existing issued, promised, and unissued pool amounts are included in SAFE Company Capitalization.
- A new/increased pool negotiated in a priced round dilutes founders and SAFE holders but does not silently reduce the new-money investor’s agreed ownership target.
- If the surviving existing pool already exceeds the target, do not create a negative top-up or shrink it silently.
- Promised options that exceed the existing pool require explicit treatment and warning.

### 7.6 Discount-only SAFE

- Before a priced round, ownership is not deterministic; show “Determined at priced financing.”
- With a priced round, compare Standard Preferred and discounted conversion routes as the contract requires.
- Validate discount range and express internally as a decimal rate.

### 7.7 MFN SAFE

- Order is chronological and material.
- An MFN may consider eligible economic terms issued later, not earlier.
- Do not cherry-pick clauses; model election of an eligible later term package.
- Non-economic side letters do not automatically change MFN economics.
- Without amendment before the priced round, model conversion at the applicable new-money price.
- State that the model does not perform a legal MFN election.
- Complex MFN chains are blocked in MVP unless counsel-approved fixtures exist.

### 7.8 Currency

- MVP permits one currency per scenario, default CAD.
- Every input and output displays ISO code.
- Do not add CAD and USD.
- Multi-currency requires a counsel-approved branch, frozen FX source/date/rate, payment currency, denomination currency, and rounding rules.

### 7.9 Unsupported-case policy

Fail closed rather than approximate:

- pre-money legacy SAFEs;
- convertible notes, warrants, secondaries, or debt;
- unusual side-letter economics;
- clause-level custom amendments;
- complex MFN chains;
- multi-currency conversion;
- multiple/sequential closings not modelled explicitly;
- waterfalls, liquidation preferences, dividends, or tax results beyond the approved model;
- numerical non-convergence or contradictory inputs.

---

## 8. Golden calculation tests

All tests use unrounded internal values.

1. **Single cap:** 500,000 at 5,000,000 = SAFE 10%, legacy 90%.
2. **Mixed caps:** 200,000/4,000,000 + 800,000/8,000,000 = 5% + 10% = 15%, legacy 85%.
3. **Five SAFEs:** five × 100,000 at 5,000,000 = 10% total.
4. **Source video:** 1,200,000/8,000,000 = 15%; 100,000/20,000,000 = 0.5%; total 15.5%.
5. **HYDRIX comparison:** 250,000/2,500,000 = 10%; /2,000,000 = 12.5%; /1,666,666.666… = 15%; /1,250,000 = 20%.
6. **Existing pool allocation:** founders 90%, granted options 8%, pool 2%, plus 500,000/5,000,000 SAFE yields founders 81%, granted options 7.2%, pool 1.8%, SAFE 10%.
7. **Priced-round benchmark:** base fully diluted shares 10,000,000; SAFEs 200,000/4M and 800,000/8M; 5M Series A at 15M pre; 10% target pool. Reproduce within approved rounding: company capitalization 11,764,705; SAFE shares 588,235 and 1,176,470; pool increase 1,695,000; round price ≈ 1.1144; new-money shares 4,486,719; post-closing total 17,946,424; founders ≈ 51.54%; SAFE conversion stakes ≈ 3.28% and 6.56% before pro rata.
8. **Close/below-cap route:** same SAFEs; 2.2M round at 8.8M pre; 10% pool target. Model cap route for Investor A and round-price route for Investor B, approximately 590,334 and 1,216,360 shares, Investor B ≈ 10.30% immediately after conversion.
9. **Discount:** no pre-round ownership; priced round selects discounted route when it yields more shares.
10. **MFN order:** moving a later cap SAFE before an MFN removes it from the candidate set and recalculates.
11. **Pool target:** increasing target dilutes founders and SAFEs while preserving agreed new-money target; target below surviving pool does not create a negative top-up.
12. **100% boundary:** exactly 100% is a blocking “terms sell the whole company” state; above 100% never displays negative ownership.
13. **Tie handling:** equal routes use a documented stable tie-break and show economic equivalence.
14. **Totals:** displayed table sums to 100.00%; underlying values retain full precision.
15. **Determinism:** canonical identical input yields byte-equivalent canonical output and hash under the same engine version.

Add property-based tests for nonnegative holdings, ownership reconciliation, monotonicity where valid, serialization round trips, idempotency, and unsupported-case blocking.

---

## 9. Data model

Use UUIDv7/ULID IDs, `timestamptz`, explicit `organization_id`, `numeric(38,18)` for share quantities/ratios, `numeric(20,4)` or integer minor units for money according to one documented policy, and `char(3)` currency.

### 9.1 Identity and tenancy

- `profiles`
- `organizations`
- `organization_memberships`
- `roles`
- `permissions`
- `role_permissions`
- `organization_invitations`
- `support_access_grants`

### 9.2 Issuer and people

- `companies`
- `company_officers`
- `stakeholders`
- `stakeholder_contacts`
- `investor_profiles`
- `investor_representations`
- `privacy_consents`
- `community_data_protocols`

### 9.3 Securities ledger

- `security_classes`
- `ledger_transactions`
- `ledger_entries`
- `share_certificates`
- `option_plans`
- `option_grants`
- `option_events`

Posted ledger transactions are append-only. Corrections use `reversal_of_id` and compensating entries.

### 9.4 Financings and instruments

- `financing_rounds`
- `investments`
- `instruments`
- `safe_terms`
- `priced_round_terms`
- `instrument_events`

Material amendment creates a new immutable event/version and never overwrites executed terms.

### 9.5 Scenarios

- `scenarios`
- `scenario_versions`
- `scenario_events`
- `scenario_runs`
- `scenario_snapshots`
- `snapshot_share_links`
- `snapshot_access_events`

Snapshots contain frozen input/output JSON, assumptions, engine/schema versions, and cryptographic hashes.

### 9.6 Governance and legal workflow

- `board_matters`
- `board_approvers`
- `board_approval_events`
- `document_templates`
- `document_template_versions`
- `template_reviews`
- `document_requests`
- `document_artifacts`
- `signature_envelopes` (later or evidence-only MVP)
- `legal_review_gates`
- `distribution_records`
- `exemption_review_records`
- `filing_deadlines`
- `filing_receipts`

### 9.7 Payments

- `funding_instructions`
- `expected_payments`
- `bank_imports`
- `bank_transactions`
- `payment_matches`
- `reconciliation_exceptions`

### 9.8 Operations and audit

- `audit_events`
- `outbox_events`
- `idempotency_keys`
- `exports`
- `reminder_rules`
- `notification_deliveries`
- `feature_flags`
- `organization_feature_flags`
- `controlled_vocabularies`
- `controlled_vocabulary_values`
- `engine_releases`
- `platform_admin_actions`
- `privacy_incidents`
- `legal_holds`

Create migrations with constraints, indexes, RLS, audit/outbox functions, and pgTAP policy tests. Do not put business-critical financial values only in unvalidated JSON.

---

## 10. State machines

### 10.1 Investment

```text
draft → data_complete → counsel_review_pending → counsel_review_recorded
→ board_evidence_pending → authorized_for_signature → sent
→ signed → funding_pending → funded → filing_evidence_pending
→ closed_record_complete
```

Allow `cancelled` from pre-execution states. Post-execution corrections require superseding records, not deletion.

### 10.2 Document

```text
draft_request → rendering → draft_generated → counsel_review_pending
→ counsel_approved_hash → board_evidence_verified → final_generated
→ sent → partially_signed → completed → delivered → archived
```

Any input/template change after counsel approval creates a new version and resets approval.

### 10.3 Scenario

```text
draft → running → succeeded|failed → frozen_snapshot → archived
```

A frozen snapshot is immutable. Editing creates a new scenario version.

---

## 11. Legal/compliance guardrails

Ontario’s Securities Act broadly defines securities and distributions and generally requires a prospectus unless an exemption applies.[^2](https://www.ontario.ca/laws/statute/90s05) The app must therefore:

- never choose an exemption;
- never determine investor eligibility;
- capture the counsel-confirmed category, statutory paragraph, purchaser residence, verification method, reviewer, evidence, amount, security, and distribution date;
- support versioned jurisdiction/date-specific exemption vocabularies;
- track Form 45-106F1 clocks where counsel configures them; the OSC states that exempt-distribution reports are generally due within 10 days, with different treatment for certain exemptions.[^3](https://www.osc.ca/en/industry/companies/reporting-issuer-and-issuer-forms/form-45-106f1-report-exempt-distribution)
- never say “filed” without a receipt/evidence artifact;
- retain applicable risk acknowledgements for at least the configured legally reviewed period;
- flag resale, dealer/finder, public-advertising, commissions, related-party, sanctions/AML, foreign investor, and multiple-province issues for counsel;
- block signatures until required counsel and board gates are met.

Corporate approvals must be statute-aware. Under the OBCA, directors manage the corporation, director resolutions/minutes and securities registers are corporate records, and written director resolutions can be valid subject to the statute and governing documents.[^4](https://www.ontario.ca/laws/statute/90b16) CBCA issuers require their own configured workflow.[^5](https://laws-lois.justice.gc.ca/eng/acts/C-44/section-20.html)

Electronic signing must be consensual, preserve identity, intent, document association, integrity, origin/destination, and timestamps, provide review/correction, deliver a copy, and support paper/manual fallback.[^6](https://www.ontario.ca/laws/statute/00e17)

### Mandatory review gates

1. Template admission by named Canadian counsel.
2. Matter review of issuer, statute, governing documents, instrument, exemptions, investor representations, board authority, filings, and referrals.
3. Automatic non-standard escalation.
4. Pre-sign approval bound to exact document SHA-256.
5. Post-close review of distribution date, executed package, evidence, deadlines, and records.
6. Fresh conversion/liquidity-event review before shares or payments are recorded.

---

## 12. Privacy, Indigenous data governance, and accessibility

PIPEDA requires accountability, identified purposes, meaningful consent, collection/use/retention limitation, safeguards, openness, and access/correction in covered commercial activity.[^7](https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/pipeda_brief)

Requirements:

- maintain a field-level data inventory with purpose, sensitivity, retention, region, processors, and roles;
- minimize investor financial, identity, and relationship evidence;
- prefer categorical attestations and a counsel-controlled evidence vault instead of raw tax returns or IDs;
- default to Canadian regions when commercially and contractually available, while accurately disclosing subprocessors and cross-border processing;
- separate required service consent from marketing consent;
- support access, correction, export, deletion request, retention, and legal hold;
- log all privacy breaches for at least two years and support real-risk-of-significant-harm assessment and notification workflows.[^8](https://www.priv.gc.ca/en/privacy-topics/privacy-for-businesses/privacy-breaches-at-your-business/gd_pb_201810)
- disable analytics/AI training by default for Indigenous/community data;
- never reuse community data for benchmarks, model training, publication, or investor scoring without community-defined authority;
- support Nation-controlled access, export, return/deletion, residency, and data-use agreements;
- have product copy and visual design reviewed by paid distinctions-aware Indigenous reviewers and relevant partner Nations.

Accessibility baseline: WCAG 2.2 AA, while mapping applicable AODA WCAG requirements.[^9](https://www.ontario.ca/laws/regulation/110191)

- keyboard-complete operation;
- visible focus;
- semantic headings, labels, tables, and validation summaries;
- screen-reader announcements for recalculation and errors;
- 200% zoom and 320 CSS-pixel reflow;
- high contrast and reduced motion;
- chart-equivalent tables and narrative summaries;
- accessible DOCX/PDF output;
- plain language, English/French readiness, and low-bandwidth resilience.

---

## 13. Technology architecture

### 13.1 Repository

Use pnpm + Turborepo, strict TypeScript:

```text
apps/web                 Next.js App Router application
apps/worker              Durable background jobs
packages/domain          Entities, branded IDs, Zod command schemas
packages/cap-table       Pure deterministic engine and fixtures
packages/db              Supabase clients, generated types, SQL helpers
packages/authz           Capabilities and authorization helpers
packages/documents       Template schemas and DOCX/PDF renderers
packages/notifications   Email/reminder logic
packages/audit           Canonical serialization and hash-chain helpers
packages/ui              Design system and accessibility primitives
supabase/migrations      Schema, constraints, RLS, functions, triggers
supabase/tests           pgTAP security and constraint tests
tests/e2e                Playwright journeys
docs                     ADRs, threat model, privacy inventory, runbooks
```

### 13.2 Recommended services

- Next.js 15+ App Router, React, TypeScript.
- Supabase Auth, PostgreSQL, Storage; Canadian region if available and suitable.
- SQL/RPC for critical transactions. Do not use an ORM that obscures RLS or numeric semantics.
- Inngest or Trigger.dev for durable jobs, retries, schedules, concurrency keys, and dead letters.
- Resend + React Email for transactional email.
- Counsel-authored DOCX template renderer using a reviewed library/licence.
- Canonical HTML to PDF through private Playwright/Chromium or private Gotenberg.
- Sentry and structured logs with PII redaction; OpenTelemetry where practical.
- Vitest, fast-check, pgTAP, Playwright, axe, and visual/golden document tests.
- Vercel or reviewed container hosting for web, with secrets in managed secret storage.

### 13.3 Modular-monolith boundaries

1. Identity and tenancy
2. Companies
3. Securities ledger
4. Cap-table engine
5. Scenario modelling
6. Governance
7. Documents
8. Investors/CRM
9. Funds operations
10. Notifications
11. Audit/compliance/privacy
12. Platform administration

Dependencies flow UI/API → application commands → domain/calculation packages → repository interfaces. `packages/cap-table` imports no Next.js, Supabase, email, browser, or document code.

---

## 14. Application commands and endpoints

Use typed server-only commands validated by Zod. Critical mutations execute through transactional PostgreSQL functions.

Commands include:

- `createOrganization`, `inviteMember`, `changeMemberRole`, `revokeMember`
- `createCompany`, `updateCompanyProfile`
- `createStakeholder`, `mergeDuplicateStakeholder`
- `createSecurityClass`, `draftLedgerTransaction`, `postLedgerTransaction`, `reverseLedgerTransaction`
- `createOptionPlan`, `grantOption`, `recordOptionEvent`
- `createFinancingRound`, `createInvestment`, `createSafe`, `approveInstrument`, `recordExecution`, `cancelInstrument`
- `createScenario`, `saveScenarioVersion`, `runScenario`, `compareScenarioRuns`, `freezeScenarioSnapshot`
- `createShareLink`, `revokeShareLink`
- `createBoardMatter`, `circulateBoardMatter`, `recordBoardApproval`
- `requestDocument`, `recordCounselReview`, `publishTemplateVersion`, `uploadSignedDocument`
- `recordExemptionReview`, `createFilingDeadline`, `uploadFilingReceipt`
- `importBankStatement`, `proposePaymentMatches`, `approvePaymentMatch`, `reversePaymentMatch`
- `requestExport`, `createReminderRule`, `recordPrivacyIncident`

Endpoints:

- `GET /s/:rawToken` — immutable read-only snapshot.
- `GET/POST /investor/:portalToken` — narrowly scoped investor workflow.
- `POST /api/webhooks/resend`
- `POST /api/webhooks/signature` (later)
- `POST /api/webhooks/jobs`

Every mutation requires an idempotency key, capability check, organization/resource check, optimistic version where applicable, and one transaction containing domain change + audit event + outbox event.

---

## 15. Security architecture

- RLS enabled and default-deny on every exposed tenant table.
- Every tenant row carries `organization_id` or is provably scoped through a parent.
- Reusable authorization in hardened `security definer` functions with fixed `search_path` and restricted execute grants.
- Browser never receives service-role key.
- Worker service-role operations perform explicit organization/resource checks.
- Storage paths begin with organization and artifact IDs; private buckets; short-lived signed URLs; content-type/size allowlists; malware scanning; SHA-256 verification.
- Banking details use envelope encryption/KMS and separate reveal capability; every reveal is audited.
- CSRF protection, restrictive CSP, secure cookies, input validation, rate limits, bot protection, SSRF-safe rendering, DOCX macro/zip-bomb checks, and CSV formula-injection neutralization.
- PII and document content excluded from logs, analytics, error breadcrumbs, and job summaries.
- No standing support access; time-limited, customer-approved grants only.
- Backups/PITR and quarterly restore tests.
- Audit events are append-only and hash-chained. Periodically anchor signed batch roots in separate immutable object storage because a privileged database operator could otherwise alter rows.
- Commission an independent security review and penetration test before production pilot.

---

## 16. Document generation and template controls

### 16.1 Template registry

Each template version stores:

- type and jurisdiction;
- governing law/statute applicability;
- source/licence/attribution;
- effective and retirement dates;
- immutable original artifact;
- SHA-256;
- merge-field schema;
- calculation-definition compatibility;
- reviewer identity, firm, jurisdiction/status reference, decision, timestamp, evidence, and notes;
- kill-switch status.

YC’s current SAFE documents are presented with CC BY-ND considerations; do not modify an official form and continue representing it as the standard YC form. Obtain legal/IP review before embedding or redistributing a template.[^10](https://www.ycombinator.com/legal)

### 16.2 Rendering

1. freeze input snapshot;
2. validate all fields and jurisdiction/template compatibility;
3. render DOCX;
4. detect unresolved placeholders and disallowed macros;
5. malware scan;
6. render PDF privately;
7. compare with golden text/visual fixture;
8. hash artifacts;
9. store immutably;
10. log audit event and notify.

Any regeneration creates a new artifact. Altering one byte after signature must invalidate hash verification.

### 16.3 E-signature

MVP may upload executed copies and record evidence. Later DocuSign/Adobe Sign integration must:

- verify provider webhooks and replay IDs;
- show exact sender, recipients, document, attachments, and timing before send;
- capture consent, intent, authentication, authority, document hash, timestamps, delivery, corrections, decline/manual fallback, and completion certificate;
- deliver completed copies and surface bounces/failures;
- never mark “delivered” merely because the file exists in a portal.

---

## 17. Background jobs

Use transactional outbox + durable jobs:

- scenario run;
- projection rebuild;
- snapshot/export generation;
- DOCX/PDF render and scan;
- reminder/deadline evaluation in organization time zone;
- email and delivery-status processing;
- bank CSV normalization and matching proposals;
- audit-chain anchoring;
- retention/deletion/legal-hold processing;
- privacy incident reminders;
- template/version retirement warnings.

Use organization/company/aggregate concurrency keys. Retries must not duplicate documents, emails, ledger posts, matches, or status changes. Dead letters are visible to authorized admins with safe retry.

---

## 18. Notifications

Transactional templates:

- invitation;
- scenario snapshot shared;
- counsel review requested/completed;
- board evidence required/recorded;
- document ready for review;
- signing requested/completed/failed;
- payment expected/received/mismatch;
- filing deadline 7/3/1 days and overdue;
- executed package delivered/failed;
- share link viewed/expired/revoked;
- security/privacy alert.

Store provider message ID, recipient, template version, status, sent time, bounce/delivery events, and correlation ID. Do not include sensitive cap-table or bank details in email bodies.

---

## 19. Analytics and reporting

MVP reports:

- financing summary;
- scenario comparison;
- cap-table as-of report;
- dilution bridge;
- instrument register;
- investor/subscription status;
- funding reconciliation;
- compliance and deadline checklist;
- closing record index;
- complete counsel/audit bundle.

Product analytics require privacy review and consent. Never send cap-table values, document text, investor financial data, Indigenous/community identity data, or bank data to behavioural analytics.

---

## 20. MVP scope

### Included

- multi-tenant organizations and six internal roles;
- Ontario/Canadian corporation profile;
- stakeholders, classes, posted ledger, basic option plan/grants;
- CAD post-money SAFE cap rows, discount-only rows, and bounded MFN modelling;
- multiple investors/SAFEs;
- priced-round and option-pool scenario model;
- live results, formula trace, comparison, frozen snapshots, private share links;
- calculation PDF/CSV;
- counsel-reviewed Canadian SAFE/side-letter and board-package template workflow;
- immutable DOCX/PDF generation after gates;
- uploaded signed copies and approval evidence;
- investor records and counsel-confirmed exemption evidence fields;
- deadline tracking and filing-receipt evidence;
- manual CSV bank import and approved matching;
- reminders, audit events, exports, admin template/engine release controls;
- WCAG 2.2 AA engineering baseline;
- explicit unsupported-case blocking.

### Deferred

- autonomous legal advice or exemption eligibility;
- notes, warrants, pre-money SAFEs, secondaries, waterfalls, complex preferences;
- multi-currency and automated FX;
- complex MFN amendments and custom side letters;
- automated pro rata allocation;
- full priced-round closing;
- in-app legally effective board voting;
- integrated e-signature;
- bank feed/open banking;
- KYC/identity verification;
- investor marketplace, recommendations, finder commissions, or transaction facilitation;
- tax calculations;
- other provinces/territories without separately versioned counsel review;
- AI redrafting of operative legal clauses.

---

## 21. Delivery phases

### Phase 0 — Domain and legal design (2–3 weeks)

- choose final brand and prohibited claims;
- retain Ontario corporate/securities counsel;
- select exact source templates and licences;
- define supported instrument terms and capitalization definition;
- approve rounding and golden cases with counsel/accountant;
- threat model, privacy inventory, Indigenous/community data policy;
- UX wireframes and accessibility review.

**Exit:** signed-off domain decision record and fixtures. No final legal documents without this phase.

### Phase 1 — Foundation (2–3 weeks)

- monorepo, CI, environments;
- Supabase Auth/Postgres/Storage;
- tenancy, roles, RLS, MFA;
- audit/outbox/idempotency;
- observability, backups, policy tests;
- base design system.

### Phase 2 — Ledger and cap table (3–5 weeks)

- companies, stakeholders, classes;
- immutable posting/reversal;
- option pool and grants;
- CSV import and reconciliation;
- accessible cap-table views and exports.

### Phase 3 — SAFE Scenario Studio (4–6 weeks)

- pure versioned engine;
- cap, discount, bounded MFN;
- priced round and option-pool solver;
- trace, warnings, comparisons;
- golden/property tests;
- snapshots and private links.

### Phase 4 — Governance and documents (3–4 weeks)

- template registry/review/publication;
- counsel and board gates;
- DOCX/PDF rendering, scanning, hashing;
- calculation reports;
- executed-copy upload and record bundles.

### Phase 5 — Investor, compliance, and funds operations (3–4 weeks)

- investor/representation records;
- neutral exemption evidence workflow;
- deadline service and receipt evidence;
- expected payments, CSV import, matching, dual approval;
- reminders and audit exports.

### Phase 6 — Hardening and pilot (3–4 weeks)

- independent security review and penetration test;
- load, retry, backup/restore, disaster-recovery tests;
- accessibility audit;
- privacy and incident runbooks;
- Indigenous distinctions-aware content/design review;
- counsel/accountant UAT;
- limited pilot, feature flags, rollback drills.

Responsible pilot estimate: approximately 4–6 months for a small senior team, dependent on legal scope and supported edge cases.

---

## 22. Definition of done

The MVP is not done until:

- cross-tenant RLS tests prove organization A cannot read, infer, mutate, export, download, or subscribe to organization B data;
- all financial calculations pass golden and property tests using arbitrary precision;
- historical snapshots reproduce under their recorded engine version;
- unsupported cases fail visibly;
- posted ledger/audit/snapshot/template/artifact records are immutable or reversable only through controlled events;
- every final artifact traces to source template hash, input hash, renderer version, actor, timestamp, counsel review, and board evidence;
- no unresolved template placeholders remain;
- duplicate jobs/webhooks/imports are idempotent;
- all critical flows pass keyboard, screen-reader, zoom/reflow, axe, and manual accessibility testing;
- privacy inventory, retention, legal holds, breach response, and subprocessor disclosures are approved;
- backup restore, key rotation, template rollback, share-link revocation, tenant export, and incident response are tested;
- Ontario counsel approves production templates, wording, gates, exemption workflow, and disclaimers;
- accountant/finance expert approves fixtures and reporting;
- paid distinctions-aware Indigenous reviewers approve product language and visual approach;
- production deployment and any legal-template publication receive explicit authorization.

---

## 23. Environment variables

Use validated server-side configuration and fail startup if mandatory values are missing.

```text
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
DIRECT_URL=
RESEND_API_KEY=
EMAIL_FROM=
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
SENTRY_DSN=
SENTRY_AUTH_TOKEN=
DOCUMENT_STORAGE_BUCKET=
DOCUMENT_RENDERER_URL=
DOCUMENT_RENDERER_TOKEN=
KMS_KEY_ID=
AUDIT_ANCHOR_BUCKET=
SHARE_TOKEN_PEPPER=
PORTAL_TOKEN_PEPPER=
CRON_SECRET=
```

Never expose service-role, renderer, KMS, token peppers, or private DSNs to browser code.

---

## 24. Root `CLAUDE.md` non-negotiable rules

```markdown
# Engineering invariants

1. Never bypass Postgres RLS or rely only on UI authorization.
2. Never use JS floating point for money, shares, prices, ratios, ownership, or FX.
3. Never overwrite posted ledger entries, executed terms, scenario snapshots, template versions, generated artifacts, approval events, filing receipts, or audit events.
4. Corrections use reversal or superseding records.
5. Every mutation requires authorization, validation, idempotency, audit, and an atomic outbox event.
6. Never log PII, document content, cap-table values, bank data, identity evidence, or community data.
7. Never select a securities exemption, declare investor eligibility, or present app output as legal/tax/accounting/investment advice.
8. Never generate a signature-ready legal document without published counsel-reviewed template, exact variable-set approval, and required board evidence.
9. Never silently approximate unsupported financing terms or numerical non-convergence.
10. Never copy YC source code, UI, copywriting, trade dress, URL schema, or trademarks.
11. Do not call a generated contract an “Indigenous SAFE.” Indigenous-centred service design does not change the legal instrument.
12. Do not enable external sending, signing, deployment, or production data changes without explicit authorization.
```

---

## 25. Initial Claude Code task sequence

1. Create the monorepo and root `CLAUDE.md`.
2. Add Architecture Decision Records for numeric library, ID format, Supabase/RLS strategy, background job provider, document renderer, audit anchoring, and Canadian-region policy.
3. Define Zod schemas for the simplified SAFE scenario and canonical serialization.
4. Implement `packages/cap-table` first with tests 1–6 and 10–15; do not connect it to UI until deterministic tests pass.
5. Scaffold Supabase migrations for organizations, memberships, companies, scenarios, versions, runs, snapshots, share links, audit, outbox, and idempotency.
6. Add default-deny RLS and pgTAP cross-tenant tests before application CRUD.
7. Build accessible Scenario Studio MVP with cap SAFEs and no priced round.
8. Add priced round, option pool, discount, and bounded MFN only after fixtures pass.
9. Add immutable snapshots and share links.
10. Add full securities ledger and detailed cap-table mode.
11. Add counsel/template/document modules behind feature flags.
12. Add governance, investor/compliance, and payment modules.
13. Complete hardening, UAT, and limited pilot before production release.

Claude must stop and request product/legal decisions when a task would require inventing an operative legal clause, eligibility rule, capitalization definition, rounding policy, investor right, Indigenous identity requirement, privacy retention rule, or unsupported conversion interpretation.

---

## 26. Open decisions requiring owner/counsel approval

1. Final public name and domain.
2. Whether “GSK” expands publicly or remains initials.
3. Target users: only Indigenous founders, Indigenous-first but open to all, or white-label for partner organizations.
4. Ontario-only MVP versus federal CBCA support at launch.
5. Exact counsel-approved Canadian SAFE source, licence, attribution, and permitted merge fields.
6. Cap-only/no-discount production document at MVP versus modelling-only support for discount/MFN.
7. Exact Company Capitalization definition and simultaneous/sequential closing policy.
8. Rounding and residual allocation.
9. Record-only versus in-product board approval.
10. Record-only executed documents versus integrated e-signature.
11. Canada-region hosting and approved subprocessors.
12. English-only pilot versus English/French launch.
13. Community/Nation partnership and governance model.
14. Pricing and business model; avoid transaction-based compensation until regulatory review.
15. Ownership and licensing of application source code, templates, and generated documents.

Defaults for development until changed: Indigenous-first/open-to-all; Ontario-first with CBCA issuer profile flag; CAD-only; cap/no-discount legal document; modelling support for cap plus bounded discount/MFN; record-only board/signature evidence; manual bank CSV; English-first but localization-ready; no transaction-based fees.

---

## 27. Primary references

1. [Y Combinator SAFE overview and country forms](https://www.ycombinator.com/safe)
2. [Y Combinator SAFE calculator](https://www.ycombinator.com/safe/calculator)
3. [Post-Money SAFE User Guide](https://bookface-static.ycombinator.com/assets/ycdc/SAFE%20User%20Guide-a47c6588327d73aa2799e61ed7c2cae9f1a0ee9acfa9c43b62039dc06e715832.pdf)
4. [YC legal terms](https://www.ycombinator.com/legal)
5. [Ontario Securities Act](https://www.ontario.ca/laws/statute/90s05)
6. [OSC exempt market overview](https://www.osc.ca/en/industry/companies/selling-securities-ontario/exempt-market)
7. [OSC Form 45-106F1 information](https://www.osc.ca/en/industry/companies/reporting-issuer-and-issuer-forms/form-45-106f1-report-exempt-distribution)
8. [Ontario Business Corporations Act](https://www.ontario.ca/laws/statute/90b16)
9. [Canada Business Corporations Act — corporate records](https://laws-lois.justice.gc.ca/eng/acts/C-44/section-20.html)
10. [Ontario Electronic Commerce Act](https://www.ontario.ca/laws/statute/00e17)
11. [PIPEDA overview](https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/pipeda_brief)
12. [OPC privacy breach guidance](https://www.priv.gc.ca/en/privacy-topics/privacy-for-businesses/privacy-breaches-at-your-business/gd_pb_201810)
13. [FNIGC OCAP®](https://fnigc.ca/ocap-training)
14. [Ontario accessibility regulation](https://www.ontario.ca/laws/regulation/110191)

---

## 28. Final non-claim

This specification describes software product behaviour and risk controls. It does not determine that any SAFE, securities exemption, investor representation, board action, electronic signature, privacy practice, tax treatment, calculation, or generated document is legally valid. Production templates, capitalization definitions, investor workflows, exemption records, corporate approvals, and jurisdictional disclosures require review and approval by qualified Canadian counsel; calculation fixtures require finance/accounting validation.
