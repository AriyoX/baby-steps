# Baby Steps closed-beta readiness handover

**Pass date:** 2026-07-23

**Decision:** Not ready for closed-beta distribution until the unapplied Supabase security migration and the critical external gates below are completed. The repository implementation is ready for installed-device and Play artifact QA.

## Starting point

- Branch: `feat/child-streak-system`
- HEAD: `b1578b1c792a8c85d3388507e19075019f68a697`
- Remote relation: four local commits ahead of `origin/feat/child-streak-system`
- Working tree: clean before this pass
- Baseline: typecheck passed; Expo Doctor passed 18/18; lint reported 79 warnings; 95 of 97 suites and 690 of 694 tests passed. Four tests failed in `GameTourRuntime.test.tsx` and `GameHydrationScopes.test.tsx`.
- No conflicting permanent Android application ID was found.

No pre-existing uncommitted user changes were present. This pass was not committed or pushed.

## Repository work completed

### Release identity, dependencies, and environment

- Set Android application ID to `com.babystepslearn.app`; retained the `babysteps` URL scheme.
- Added a release regression test that rejects a prototype application ID.
- Changed the GitHub Android workflow to use `npm ci`.
- Added `.env.example` with only the Supabase public URL and anon-key variable names, plus explicit warnings against public service-role, deletion-admin, SMTP, or server secrets.
- Added Expo-compatible `expo-application`, `expo-secure-store`, and `expo-system-ui`.
- Removed unused `expo-sharing`, `react-native-webview`, and `axios`.
- Updated compatible transitive dependency overrides. The production dependency audit is clear.
- Configured production builds to strip `console.*`; no analytics or crash-reporting SDK was added.

### Child-facing safety and honest UI

- Removed all Museum YouTube links, video controls, WebView/modal code, and associated loading state.
- Removed Coloring Studio system sharing and its dependency. Local Save remains, with explicit success, denial, cancellation, and failure handling.
- Confirmed child runtime source has no external URL, browser-opening, WebView, or system Share API.
- Removed random/sample parent progress and the placeholder child level badge. Profile dates are now labelled as profile creation dates.
- Removed release UI for developer diagnostics, fake child progress, placeholder settings rows, and unavailable account/profile actions.
- Reworded child removal as archive/deactivate behavior; it is not represented as permanent deletion.
- Parent About now shows runtime application version/build, a modest Closed beta label, verified configured support address, and privacy-safe feedback guidance.

### Content and language boundary

- Added allowlisted route and backing-content checks for lessons, stories, games, coloring, and Museum cards.
- Added production image/audio checks and nested Learning Hub publication filtering.
- Hidden draft, placeholder, unreviewed, unsupported, missing-media, dead-route, and non-completable content without inventing replacement curriculum.
- Story payloads must be explicitly reviewed before publication.
- Content selection is exact-language. Missing Runyankole (`nyn`) produces an honest unavailable state and never queries or falls back to Luganda (`lg`).
- The migration demotes currently published-but-unreviewed Learning Hub/story rows; it does not delete draft content.

### Parent boundary and sensitive actions

- Replaced the arithmetic gate with a six-digit, account-scoped parent PIN stored only in Expo SecureStore.
- Added authenticated PIN setup/change/reset using the current parent password.
- Added generic failure feedback, five-attempt rate limiting, a persisted 30-second cooldown, and constant-time comparison.
- Added an account-scoped secure active-child marker so restart, backgrounding, account switching, child switching, and sign-out do not expose parent routes.
- Parent routes wait for active-child restoration and redirect direct child-to-parent attempts to the gate.
- Account deletion now requires the confirmation word and fresh current-password reauthentication; recent authorization is cleared on background/account change.

### Data, progress, streaks, notifications, and media

- Scoped queued progress identities and pending counts by parent account as well as child, language, and activity.
- Preserved unbound offline writes until ownership can be verified; another account cannot see or sync the prior account's queue.
- Kept local-first completion and existing hydration/idempotency behavior.
- Corrected stale hook dependencies/cleanup and all lint warnings that could affect hydration, navigation, child/language refresh, audio, tours, or orientation.
- Fixed Museum instrument loop cleanup and counting-game sound/progress cleanup.
- Retained per-child, language-independent streak behavior and one grouped reminder path; relevant regression coverage remains green.
- Removed verbose production logging paths, especially state/progress identifiers and payloads.

## Tests added or strengthened

- Permanent package identity, npm workflow, required Expo modules, removed child external APIs, removed fake/internal routes, public environment variables, and production console stripping.
- Parent PIN setup, success/failure, cooldown, reset, account switching, app-state clearing, and password reauthentication.
- Parent route guards, gate UI behavior, direct-route handling, and deletion reauthentication.
- Secure active-child persistence, restart restoration, clear behavior, corrupt-record handling, save-before-navigation, and cross-account isolation.
- Exact-language content, Runyankole no-fallback, startable route allowlists, backing content, nested publication filters, reviewed stories, required media, and placeholder rejection.
- Museum route publication gates and absence of external video UI.
- Account-scoped progress queue behavior.
- Migration contract assertions for RLS, policies, grants, helper functions, search paths, indexes, and draft demotion.
- Fixed the four baseline test failures by correcting stale test timing/orientation assumptions and the incomplete hydration mock.

## Verification results

Run from the repository on 2026-07-23:

- `npm ci`: passed; 1,165 packages audited, zero vulnerabilities.
- `npm run typecheck`: passed.
- `npm test -- --runInBand`: 100/100 suites and 726/726 tests passed; zero snapshots.
- `npm run lint`: passed with zero errors and zero warnings.
- `npx expo-doctor`: 18/18 checks passed.
- `npx expo config --type public --json`: passed; final package, unchanged scheme, automatic UI style, and no server-secret names were confirmed in generated public config.
- `npm audit --omit=dev`: zero vulnerabilities.
- `npx expo export --platform android --output-dir <temporary-directory>`: passed; 2,318 modules bundled, 214 output files, 101,435,264 bytes. A focused bundle-string check found none of the deprecated identity, external-video placeholders, sensitive progress diagnostics, or Developer Info markers. Temporary output was validated and removed. This was a JavaScript export, not an APK/AAB build.
- Focused source/config searches: no deprecated application ID marker; no child YouTube, WebView, system Share, browser-opening, or arbitrary URL code; no fake parent progress or Developer Info; no current Sunbird credential literal.
- `git diff --check`: passed.

The clean install prints deprecation notices for tooling/transitive packages such as old `glob`, `rimraf`, and `inflight`, but the resolved production audit contains no advisory.

## Database migration

`supabase/migrations/20260723100638_closed_beta_security_hardening.sql` was created and remains unapplied.

It:

- enables RLS on `languages`, `achievements`, `activities`, and `child_achievements`;
- adds active-child ownership and least-privilege reference-content policies;
- narrows anon/authenticated grants;
- restricts deletion-finalizer helpers to `service_role`;
- restricts lifecycle and public streak RPC exposure;
- fixes mutable trigger-function search paths;
- adds advisor-requested foreign-key indexes; and
- demotes unreviewed published Learning Hub/story rows without deleting them.

Apply it only after staging review, backup verification, dry-run preview, and two-parent isolation QA. Exact steps are in `docs/release/CLOSED_BETA_SUPABASE_FOLLOW_UP_2026-07-23.md`.

## Supabase evidence

### Repository evidence

- Fourteen prior migrations exist through `20260721140831`; the new hardening migration is the next local migration.
- Migration contract tests cover ownership, grants, RLS, helper privileges, search paths, indexes, and content demotion.
- The repository has no complete historical base migration for a reliable local database reset, so static migration tests do not replace staging execution or two-parent QA.

### Live read-only evidence

The linked project inspected on 2026-07-23 was `ydtxgwlnldfuqamhxfqi`. No live state was changed.

- Remote migration history matched the fourteen pre-pass repository migrations.
- RLS was off on `activities`, `achievements`, `child_achievements`, and `languages`.
- Broad anon/authenticated grants remained on legacy/reference tables and service finalizer helpers.
- Security Advisor also reported mutable search paths, exposed security-definer helpers, leaked-password protection disabled, and a vulnerable PostgreSQL platform build.
- Performance Advisor reported missing foreign-key indexes, RLS init-plan opportunities, and informational unused-index findings.
- `finalize-account-deletions` was active at version 4 with JWT verification disabled for its custom-secret design.
- Exactly one active cron job existed: `finalize-account-deletions-daily` at `0 2 * * *`. No duplicate was created.
- Live content had 17 rows. Eleven Luganda rows were published/startable; all six Runyankole rows were draft/non-startable. The client exact-language path does not fall back.

## Remaining gates

Critical before tester distribution:

1. Stage, approve, apply, and verify the hardening migration.
2. Run ordinary-client two-parent cross-account isolation QA and re-run both Supabase Advisors.
3. Confirm the former Sunbird credential found in five historical Git revisions is revoked. Current source is credential-free. Rewriting shared history, if required, needs separate approval.
4. Verify the deletion finalizer secret/deployed source, dry run, simulated expiry, anonymized logs, daily execution, and failure alerts.
5. Verify a restorable backup with an isolated restore drill.

Release operations:

- Configure and test custom SMTP, SPF/DKIM/DMARC, branded templates, redirects, rate limits, Gmail delivery, and another provider.
- Publish mobile-readable HTTPS Privacy Policy, Terms, account-deletion, and support pages. No pages were deployed in this pass.
- Decide whether to persist legal policy version and acceptance timestamp. Signup acknowledgement is required, but proof is not persisted and the current schema has no parent/profile record suited to it.
- Prove `hello@babystepslearn.com` is monitored and deliverable.
- Produce the required 512x512 icon (the configured source is 500x500), 1024x500 feature graphic, and final-build phone/tablet screenshots without personal data.
- Prepare reviewer credentials/instructions and complete Target Audience/Families, Data Safety, App Access, ads, content rating, and deletion declarations.
- Build and inspect the production AAB through the approved release process, including target API, permissions, 16 KB compatibility, device catalogue, pre-launch report, crashes, ANRs, and policy warnings.
- Complete the prioritized installed-device matrix in the dated release checklist.

## Rollback notes

- No database rollback is needed for this pass because the migration was not applied.
- Before merge/build, repository changes can be reverted as one reviewed change set; restore the removed dependencies only if the removed child features are intentionally reintroduced behind an approved design.
- If the migration is later applied and an access regression appears, stop distribution and correct the narrow policy/grant after identifying the failing ordinary-client operation. Do not disable RLS or restore broad client grants.
- Use the verified pre-migration backup only for a confirmed destructive/unrecoverable database outcome.
- Changing away from `com.babystepslearn.app` after the first Play upload is not a viable rollback.

## Actions explicitly not performed

- No commit or push.
- No live Supabase mutation, migration application, function deployment, Auth setting change, or cron change.
- No APK, AAB, IPA, or EAS cloud build.
- No Google Play submission.
- No website deployment.
