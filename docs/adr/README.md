# Architecture Decision Records

| ADR                                              | Title                                                | Status                                                       |
| ------------------------------------------------ | ---------------------------------------------------- | ------------------------------------------------------------ |
| [0001](./0001-numeric-arithmetic-library.md)     | Arbitrary-precision numeric arithmetic library       | Proposed default, pending accountant validation              |
| [0002](./0002-id-format.md)                      | Primary key / entity ID format (UUIDv7)              | Accepted (development default)                               |
| [0003](./0003-supabase-rls-strategy.md)          | Supabase / Row-Level Security strategy               | Accepted (development default)                               |
| [0004](./0004-background-job-provider.md)        | Background job / durable workflow provider (Inngest) | Accepted (development default)                               |
| [0005](./0005-document-renderer.md)              | Document rendering pipeline                          | Accepted (development default); template source out of scope |
| [0006](./0006-audit-anchoring.md)                | Audit event hash-chaining and anchoring              | Accepted (development default)                               |
| [0007](./0007-canadian-region-hosting-policy.md) | Canadian-region hosting and subprocessor policy      | Proposed default, pending owner decision (spec §26 item 11)  |

None of these ADRs constitute final legal, security, or product sign-off.
See spec §26 for the full list of decisions requiring owner/counsel
approval, and root `CLAUDE.md` for the engineering invariants these ADRs
must not violate.
