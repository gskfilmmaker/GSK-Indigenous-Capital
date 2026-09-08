# GSK Indigenous Capital — SAFE Studio

A Canadian, Indigenous-founder-centred alternative to YC's SAFE
calculator and financing workflow.

Read `CLAUDE.md` and
`GSK_Indigenous_Capital___SAFE_Studio__Claude_Code_Master_Specification.md`
before making any product, legal, data, or architecture decision in this
repository — the spec is the source of truth, and `CLAUDE.md` carries the
non-negotiable engineering invariants.

## Status

Repository foundation (monorepo, CI, ADRs). The calculation engine,
design system, and Scenario Studio MVP land in subsequent steps — see
`docs/adr/README.md` for architecture decisions made so far and the
spec's §21 delivery phases for what's next.

## Getting started

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm lint
pnpm test:unit
pnpm test:e2e   # starts apps/web's dev server automatically
```

## Layout

See "Repository layout" in `CLAUDE.md`.
