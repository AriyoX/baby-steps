# Baby Steps Documentation

This folder documents the current Baby Steps prototype and the work needed to move it toward an MVP. The codebase is the source of truth; planned features are labeled as planned.

## Start Here

| Doc | Audience | Purpose |
| --- | --- | --- |
| [Project README](../README.md) | Everyone | Setup, feature summary, commands, and known limitations. |
| [Feature docs](features/README.md) | Product, design, QA, developers | Current behavior for each app feature. |
| [Developer setup](development/setup.md) | Developers | Install, run, test, and common setup issues. |
| [Project structure](development/project-structure.md) | Developers | Where code and content live. |
| [Testing guide](development/testing.md) | Developers, QA | Current test setup and test gaps. |
| [Database-backed content](features/database-content.md) | Developers, product, QA | Runtime architecture, language isolation, security, cache, and deployed state. |
| [Child learning streaks](features/child-streaks.md) | Product, QA, developers | Completion rules, parent controls, synchronization, reminders, security, and QA. |
| [Content management](development/content-management.md) | Developers, content contributors | Database-content ownership and the migration-based update workflow. |
| [Content authoring and new games](development/content-authoring-and-new-games.md) | Developers, content contributors | Payload examples, stable-ID rules, seeds, smoke test, and adding a language. |
| [Database notes](development/database.md) | Developers | Current Supabase schema snapshot and gaps. |
| [Account deletion finalization](development/account-deletion-finalization.md) | Developers, release owners | Secure server-side final account deletion process and manual QA. |
| [Deployment readiness](development/deployment.md) | Developers, release owners | Build commands, readiness status, blockers, and launch notes. |
| [Manual QA checklist](qa/manual-qa-checklist.md) | QA, developers | Device and regression testing checklist. |
| [Recurring notifications](features/notifications.md) | Product, QA, developers | Permission flow, gentle notification model, privacy, native configuration, and QA. |
| [Network connectivity](features/network-connectivity.md) | Product, QA, developers | Internet requirements, offline alerts, guarded operations, and QA. |
| [Responsive game and learning UI](features/responsive-game-learning-ui.md) | Product, QA, developers | Landscape responsiveness across Learning Hub mechanics and child games. |
| [MVP roadmap](mvp-roadmap.md) | Product, developers | Current release priorities, risks, and out-of-scope items. |

## Existing Reports

- [Refactor report](../REFACTOR_REPORT.md)
- [Verification report](../VERIFICATION_REPORT.md)
- [Documentation verification report](../DOCS_VERIFICATION_REPORT.md)
- [Privacy policy](../PRIVACY_POLICY.md)
- [Account and data deletion page](delete-account.html)

## Documentation Rules

- Keep implemented, partial, prototype-only, and planned features separate.
- Use exact commands from `package.json`.
- Do not document payments, subscriptions, or admin/CMS tooling as implemented. The migration-managed database content MVP is implemented; describe its limits accurately.
- Link to source files and reports instead of duplicating long explanations.
