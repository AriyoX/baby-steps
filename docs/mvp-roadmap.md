# MVP Roadmap

## Current State

As of 2026-07-15, Baby Steps has:

- Supabase authentication, child profiles, activities, achievements, and local-first progress flows;
- child Games, Stories, Coloring, and Learning navigation, with Museum archived/hidden;
- a database-backed Learning Hub, exact-language menus, five supplementary game bundles, and eight generic Stories;
- strict `lg`/`nyn` isolation with no Luganda substitution for missing Runyankole content;
- shared stale-while-revalidate content caching and bundled image/audio resolver maps;
- migration-managed initial content and child-readable, non-writable `content_items` security;
- 58 passing Jest suites and 430 passing tests, plus a passing typecheck.

The database content phase is implemented. Remaining MVP work is release hardening, reviewed content, device verification, and existing database/security cleanup—not a CMS rebuild.

## Required Before Deployment

- Restore the missing original base-schema migration so a clean `supabase db reset` validates the whole project.
- Resolve or explicitly accept the remaining Supabase database/auth advisor findings outside `content_items`.
- Review placeholder lesson copy, images, and pronunciation audio with qualified language/content reviewers.
- Test auth, child-mode entry/exit, Learning, games, Stories, Coloring, offline restart, audio, and permissions on supported devices.
- Replace placeholder/random parent dashboard metrics and remove or implement broken future settings links.
- Investigate the Jest worker teardown/open-handle warning even though the suite passes.
- Plan replacement for deprecated `expo-av` before an Expo upgrade makes it blocking.
- Verify privacy, account-deletion, store metadata, and release configuration against actual app behavior.

## Current Priorities

| Priority | Work | Exit condition |
| --- | --- | --- |
| 1 | Database and security baseline | Fresh reset works; migrations align; release-relevant advisor findings are resolved. |
| 2 | Content review | Shipped language content and media are reviewed; placeholders remain honestly non-production. |
| 3 | Device and offline QA | Core parent/child flows pass on target Android/iOS devices, including cached-content restart. |
| 4 | Product-data cleanup | Parent progress reflects stored data and no reachable settings route is broken. |
| 5 | Release readiness | Regression suite, builds, privacy/deletion checks, and rollback/support plan pass. |

## Out Of Scope

- Practice Mix implementation.
- A full admin CMS or in-app authoring.
- Payments, subscriptions, and premium entitlements.
- Institution/school management.
- Multi-device progress merging or a replacement progress architecture.
- Production analytics/personalization.
- Moving bundled image/audio binaries to Storage without a separate requirement.

## Risks And Blockers

- The checked-in migration chain does not recreate the original base schema from an empty database.
- Some database tables/functions and auth settings still have pre-existing advisor findings.
- Placeholder curriculum/audio must not be presented as reviewed production language content.
- Progress is intentionally local-first with Supabase activity/achievement writes; offline and device behavior needs installed-build QA.
- Parent dashboard metrics are not yet fully derived from normalized progress.
- Native media, orientation, and audio behavior cannot be proven by Jest alone.

## References

- [Database-Backed Content](features/database-content.md)
- [Content Authoring And New Games](development/content-authoring-and-new-games.md)
- [Testing Guide](development/testing.md)
- [Database Notes](development/database.md)
- [Deployment Readiness](development/deployment.md)
- [Manual QA Checklist](qa/manual-qa-checklist.md)
